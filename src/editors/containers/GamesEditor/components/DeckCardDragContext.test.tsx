import React from 'react';
import { act, initializeMocks, render, screen } from '@src/testUtils';

import { emptyCard } from '@src/editors/containers/GamesEditor/data/gameTransitions';
import type { Card, Deck } from '@src/editors/containers/GamesEditor/types';
import {
  DeckCardDragProvider,
  DeckCardList,
  DeckDropTarget,
  useDeckDragPreview,
  type CardMove,
} from './DeckCardDragContext';

// jsdom has no layout, so the drag sensors are never driven. The provider's
// handlers are captured from the one DndContext and called directly, which is
// what tests the real preview/commit logic without stubbing geometry.
let mockHandlers: {
  onDragStart?: (event: any) => void;
  onDragOver?: (event: any) => void;
  onDragEnd?: (event: any) => void;
  onDragCancel?: (event: any) => void;
} = {};
// Set before a render to make the mocked useDroppable report a hover.
let mockHoveredDroppableId: string | null = null;
// The accessibility announcements the provider registered, for the unit-level
// check that a no-op target says nothing.
let mockAnnouncements: { onDragOver?: (event: any) => string | undefined; } | undefined;

jest.mock('@dnd-kit/core', () => {
  const actual = jest.requireActual('@dnd-kit/core');
  const ReactModule = jest.requireActual('react');
  return {
    ...actual,
    DndContext: ({ children, onDragStart, onDragOver, onDragEnd, onDragCancel, accessibility }: any) => {
      mockHandlers = { onDragStart, onDragOver, onDragEnd, onDragCancel };
      mockAnnouncements = accessibility?.announcements;
      return ReactModule.createElement('div', null, children);
    },
    // The real overlay renders only while a card is active; here it has to
    // render so its wrapper can be inspected.
    DragOverlay: (
      { children, className }: any,
    ) => (children ? ReactModule.createElement('div', { className, 'data-testid': 'drag-overlay' }, children) : null),
    useDroppable: ({ id }: { id: string; }) => ({
      isOver: id === mockHoveredDroppableId,
      setNodeRef: () => undefined,
    }),
  };
});

const card = (id: string): Card => ({ ...emptyCard(), id, term: id, card_key: 'key-' + id });
const deck = (id: string, ids: string[]): Deck => ({ id, name: id, cards: ids.map(card) });

const Preview = () => {
  const { previewDecks } = useDeckDragPreview();
  return (
    <div data-testid="preview">
      {previewDecks.map((entry) => entry.id + ':' + entry.cards.map((c) => c.id).join(',')).join(' | ')}
    </div>
  );
};

const preview = () => screen.getByTestId('preview').textContent;

// dnd-kit's activator event decides whether focus follows the card: a pointer
// event means mouse/touch, a keyboard event means Space or Enter.
const pointerEvent = () => new MouseEvent('pointerdown');
const keyboardEvent = () => new KeyboardEvent('keydown', { code: 'Space' });

const dragStart = (cardId: string, activatorEvent: Event = pointerEvent()) =>
  act(() => {
    mockHandlers.onDragStart?.({ active: { id: cardId }, activatorEvent });
  });
const dragOver = (cardId: string, overId: string, activatorEvent: Event = pointerEvent()) =>
  act(() => {
    mockHandlers.onDragOver?.({ active: { id: cardId }, over: { id: overId }, activatorEvent });
  });
const dragEnd = (cardId: string, overId: string | null, activatorEvent: Event = pointerEvent()) =>
  act(() => {
    mockHandlers.onDragEnd?.({ active: { id: cardId }, over: overId ? { id: overId } : null, activatorEvent });
  });
const dragCancel = (activatorEvent: Event = pointerEvent()) =>
  act(() => mockHandlers.onDragCancel?.({ activatorEvent }));

/** Let the two animation frames of a focus attempt run. */
const settle = () =>
  act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
  });

const renderDrag = (decks: Deck[], onCardMove = jest.fn<void, [CardMove]>(), extra?: React.ReactNode) => {
  render(
    <DeckCardDragProvider decks={decks} onCardMove={onCardMove} renderOverlayCard={() => null}>
      <Preview />
      {decks.map((entry) => (
        <DeckDropTarget
          key={entry.id}
          deckId={entry.id}
          isExpanded
          onRequestExpand={() => undefined}
        >
          {entry.id + ' header'}
        </DeckDropTarget>
      ))}
      {extra}
    </DeckCardDragProvider>,
  );
  return onCardMove;
};

describe('DeckCardDragContext', () => {
  beforeEach(() => {
    initializeMocks();
    mockHoveredDroppableId = null;
  });

  it('reorders within a deck in the preview and commits the position once', () => {
    const decks = [deck('d1', ['A', 'B', 'C'])];
    const onCardMove = renderDrag(decks);

    dragStart('A');
    expect(preview()).toEqual('d1:A,B,C');

    dragOver('A', 'B');
    // Within one deck the sorting strategy draws the gap; the preview order is
    // untouched so the row is not displaced twice.
    expect(preview()).toEqual('d1:A,B,C');

    dragEnd('A', 'B');

    expect(onCardMove).toHaveBeenCalledTimes(1);
    expect(onCardMove).toHaveBeenCalledWith({ cardId: 'A', toDeckId: 'd1', toIndex: 1 });
    // The preview is dropped on commit; only the caller applies the move.
    expect(preview()).toEqual('d1:A,B,C');
    expect(decks[0].cards.map((c) => c.id)).toEqual(['A', 'B', 'C']);
  });

  it('previews a cross-deck move before the hovered row and commits it once', () => {
    const decks = [deck('d1', ['A']), deck('d2', ['X', 'Y'])];
    const onCardMove = renderDrag(decks);

    dragStart('A');
    dragOver('A', 'Y');
    expect(preview()).toEqual('d1: | d2:X,A,Y');

    dragEnd('A', 'Y');
    expect(onCardMove).toHaveBeenCalledTimes(1);
    expect(onCardMove).toHaveBeenCalledWith({ cardId: 'A', toDeckId: 'd2', toIndex: 1 });
  });

  // From an earlier deck, the first row of a later one is position 1, not the
  // position after it: index 0 of a non-empty later deck used to be unreachable.
  it('previews and commits index 0 of a later deck that holds cards', () => {
    const decks = [deck('d1', ['A']), deck('d2', ['X', 'Y'])];
    const onCardMove = renderDrag(decks);

    dragStart('A');
    dragOver('A', 'X');
    expect(preview()).toEqual('d1: | d2:A,X,Y');

    dragEnd('A', 'X');
    expect(onCardMove).toHaveBeenCalledWith({ cardId: 'A', toDeckId: 'd2', toIndex: 0 });
  });

  // The announcement is read after the preview has taken the card in, so the
  // hovered row's own index is one past the gap: the position has to come from
  // the drop itself, or it names a place the card will not land in.
  it('announces the position the drop will take, in another deck', () => {
    const decks = [deck('d1', ['A', 'B']), deck('d2', ['X', 'Y'])];
    renderDrag(decks);

    dragStart('A');
    dragOver('A', 'X');
    expect(mockAnnouncements?.onDragOver?.({ active: { id: 'A' }, over: { id: 'X' } }))
      .toEqual('A moved over position 1 of d2.');

    dragOver('A', 'Y');
    expect(mockAnnouncements?.onDragOver?.({ active: { id: 'A' }, over: { id: 'Y' } }))
      .toEqual('A moved over position 2 of d2.');
  });

  it('expands a collapsed deck header and appends the card to it', () => {
    mockHoveredDroppableId = 'deck:d2';
    const onCardMove = jest.fn<void, [CardMove]>();
    const CollapsedDeck = () => {
      const [open, setOpen] = React.useState(false);
      return (
        <DeckDropTarget
          deckId="d2"
          isExpanded={open}
          onRequestExpand={() => setOpen(true)}
        >
          {open ? 'Deck 2 open' : 'Deck 2 closed'}
        </DeckDropTarget>
      );
    };
    const decks = [deck('d1', ['A']), deck('d2', ['X'])];
    renderDrag(decks, onCardMove, <CollapsedDeck />);

    // Hovering the header asks the outline to open it.
    expect(screen.getByText('Deck 2 open')).toBeInTheDocument();

    dragStart('A');
    dragOver('A', 'deck:d2');
    expect(preview()).toEqual('d1: | d2:X,A');

    dragEnd('A', 'deck:d2');
    expect(onCardMove).toHaveBeenCalledWith({ cardId: 'A', toDeckId: 'd2', toIndex: 1 });
  });

  // A deck holding only its unkeyed placeholder is empty for authoring, so it
  // shows the drop zone; the placeholder card itself stays editable.
  it('puts a card into a placeholder-only deck at index 0 through the empty zone', () => {
    const placeholder = emptyCard();
    const decks: Deck[] = [
      { id: 'd1', name: 'd1', cards: [card('A')] },
      { id: 'd2', name: 'd2', cards: [placeholder] },
    ];
    const onCardMove = jest.fn<void, [CardMove]>();
    renderDrag(decks, onCardMove, <DeckCardList deckId="d2" renderCard={() => null} />);

    expect(screen.getByText('Drop a card here')).toBeInTheDocument();

    dragStart('A');
    dragOver('A', 'deck:d2:empty');
    expect(preview()).toEqual('d1: | d2:A');

    dragEnd('A', 'deck:d2:empty');
    expect(onCardMove).toHaveBeenCalledTimes(1);
    expect(onCardMove).toHaveBeenCalledWith({ cardId: 'A', toDeckId: 'd2', toIndex: 0 });
    // Committed decks are never mutated; the placeholder is still there.
    expect(decks[1].cards).toEqual([placeholder]);
  });

  // After a cross-deck preview has re-parented the card, dnd-kit can report
  // the card itself as the target. The last real target is the drop.
  it('commits the last valid target when the final over is the active card', () => {
    const decks = [deck('d1', ['A']), deck('d2', ['X', 'Y'])];
    const onCardMove = renderDrag(decks);

    dragStart('A');
    dragOver('A', 'Y');
    expect(preview()).toEqual('d1: | d2:X,A,Y');

    dragOver('A', 'A');
    dragEnd('A', 'A');

    expect(onCardMove).toHaveBeenCalledTimes(1);
    expect(onCardMove).toHaveBeenCalledWith({ cardId: 'A', toDeckId: 'd2', toIndex: 1 });
  });

  // A same-deck drag that ends over its own id has not moved, even though a
  // row hover recorded a target earlier.
  it('does not commit a same-deck drag that ends over the active card', () => {
    const decks = [deck('d1', ['A', 'B', 'C'])];
    const onCardMove = renderDrag(decks);

    dragStart('A');
    dragOver('A', 'B');
    dragEnd('A', 'A');

    expect(onCardMove).not.toHaveBeenCalled();
    expect(preview()).toEqual('d1:A,B,C');
  });

  // Returning across a preview to the source deck's empty zone is the same
  // no-op as its header: the committed view comes back and nothing commits.
  it('restores the preview when a keyboard drag returns to the source empty zone', () => {
    const decks = [deck('d1', ['A']), deck('d2', ['X'])];
    const onCardMove = renderDrag(decks);

    dragStart('A', keyboardEvent());
    dragOver('A', 'X', keyboardEvent());
    expect(preview()).toEqual('d1: | d2:A,X');

    dragOver('A', 'deck:d1:empty', keyboardEvent());
    expect(preview()).toEqual('d1:A | d2:X');
    // The announcement must not claim a move to the deck the card is still in.
    expect(mockAnnouncements?.onDragOver?.({ active: { id: 'A' }, over: { id: 'deck:d1:empty' } }))
      .toBeUndefined();

    dragEnd('A', 'deck:d1:empty', keyboardEvent());
    expect(onCardMove).not.toHaveBeenCalled();
  });

  it('treats a final drop outside every target as a cancel', () => {
    const decks = [deck('d1', ['A']), deck('d2', ['X'])];
    const onCardMove = renderDrag(decks);

    dragStart('A');
    dragOver('A', 'X');
    dragEnd('A', null);

    expect(onCardMove).not.toHaveBeenCalled();
    expect(preview()).toEqual('d1:A | d2:X');
  });

  it('restores the committed view on cancel, with no commit and no mutation', () => {
    const decks = [deck('d1', ['A', 'B']), deck('d2', ['X'])];
    const before = JSON.parse(JSON.stringify(decks));
    const onCardMove = renderDrag(decks);

    dragStart('A');
    dragOver('A', 'X');
    expect(preview()).toEqual('d1:B | d2:A,X');

    dragCancel();

    expect(preview()).toEqual('d1:A,B | d2:X');
    expect(onCardMove).not.toHaveBeenCalled();
    expect(JSON.parse(JSON.stringify(decks))).toEqual(before);
  });

  // Same-deck hovers only record the target; the preview never moves, so the
  // row does not jump between the pointer's position and the sorting gap.
  it('commits once however many times the pointer crosses rows', () => {
    const decks = [deck('d1', ['A', 'B', 'C'])];
    const onCardMove = renderDrag(decks);

    dragStart('A');
    dragOver('A', 'B');
    dragOver('A', 'C');
    dragOver('A', 'B');
    expect(preview()).toEqual('d1:A,B,C');

    dragEnd('A', 'C');
    expect(onCardMove).toHaveBeenCalledTimes(1);
    // Resolved against the committed decks, not the preview index.
    expect(onCardMove).toHaveBeenCalledWith({ cardId: 'A', toDeckId: 'd1', toIndex: 2 });
  });

  // Pointer drops on the card's own deck header keep the resolver's append.
  it('appends a pointer drag dropped on its own deck header', () => {
    const decks = [deck('d1', ['A', 'B', 'C'])];
    const onCardMove = renderDrag(decks);

    dragStart('A');
    dragOver('A', 'deck:d1');
    dragEnd('A', 'deck:d1');

    expect(onCardMove).toHaveBeenCalledTimes(1);
    expect(onCardMove).toHaveBeenCalledWith({ cardId: 'A', toDeckId: 'd1', toIndex: 2 });
  });

  // A keyboard drag that returns to its own header after a cross-deck preview
  // shows the committed tree again and commits nothing.
  it('restores the preview and commits nothing when a keyboard drag returns to its own header', async () => {
    const decks = [deck('d1', ['A', 'B']), deck('d2', ['X'])];
    const onCardMove = renderDrag(decks);

    dragStart('A', keyboardEvent());
    dragOver('A', 'X', keyboardEvent());
    expect(preview()).toEqual('d1:B | d2:A,X');

    dragOver('A', 'deck:d1', keyboardEvent());
    expect(preview()).toEqual('d1:A,B | d2:X');

    dragEnd('A', 'deck:d1', keyboardEvent());
    expect(onCardMove).not.toHaveBeenCalled();
    expect(preview()).toEqual('d1:A,B | d2:X');

    // Let the keyboard focus attempt settle before the next test renders its
    // own rows: the retry looks the card up by attribute in the live document.
    await settle();
  });

  // A pointer drag never had focus on the handle, so it must not take it (and
  // pop the handle's tooltip) when it ends or is cancelled.
  it('leaves focus alone when a pointer drag ends or is cancelled', async () => {
    const decks = [deck('d1', ['A'])];
    renderDrag(
      decks,
      jest.fn<void, [CardMove]>(),
      (
        <>
          <div data-dnd-id="A">
            <button type="button" data-drag-handle>handle</button>
          </div>
          <button type="button" data-testid="elsewhere">elsewhere</button>
        </>
      ),
    );
    const elsewhere = screen.getByTestId('elsewhere');
    const handle = screen.getByRole('button', { name: 'handle' });

    elsewhere.focus();
    dragStart('A');
    dragEnd('A', 'deck:d1');
    await settle();
    expect(elsewhere).toHaveFocus();
    expect(handle).not.toHaveFocus();

    elsewhere.focus();
    dragStart('A');
    dragCancel();
    await settle();
    expect(elsewhere).toHaveFocus();
    expect(handle).not.toHaveFocus();
  });

  // The overlay is portalled to <body>, out of the editor wrapper, so the
  // overlay's own wrapper carries the scope class its preview sizes come from.
  it('renders the drag overlay inside the editor scope class', () => {
    render(
      <DeckCardDragProvider
        decks={[deck('d1', ['A'])]}
        onCardMove={jest.fn<void, [CardMove]>()}
        renderOverlayCard={(dragged) => <span>overlay {dragged.term}</span>}
      >
        <Preview />
      </DeckCardDragProvider>,
    );
    expect(screen.queryByTestId('drag-overlay')).not.toBeInTheDocument();

    dragStart('A');

    const overlay = screen.getByTestId('drag-overlay');
    expect(overlay).toHaveClass('xblock-games-editor');
    expect(overlay).toHaveTextContent('overlay A');
  });

  it('refuses to drag the blank placeholder card', () => {
    const blank = emptyCard();
    const decks: Deck[] = [{ id: 'd1', name: 'd1', cards: [blank] }, deck('d2', ['X'])];
    const onCardMove = renderDrag(decks);

    dragStart(blank.id);
    dragOver(blank.id, 'X');
    expect(preview()).toEqual('d1:' + blank.id + ' | d2:X');

    dragEnd(blank.id, 'X');
    expect(onCardMove).not.toHaveBeenCalled();
  });
});
