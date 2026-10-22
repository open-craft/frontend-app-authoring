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
let mockAnnouncements: {
  onDragOver?: (event: any) => string | undefined;
  onDragEnd?: (event: any) => string | undefined;
} | undefined;
// The collision detector the provider registered, so a test can hand it the
// pointer coordinates the real dnd-kit would.
let mockCollisionDetection: ((args: any) => any[]) | undefined;

jest.mock('@dnd-kit/core', () => {
  const actual = jest.requireActual('@dnd-kit/core');
  const ReactModule = jest.requireActual('react');
  return {
    ...actual,
    DndContext: (
      { children, onDragStart, onDragOver, onDragEnd, onDragCancel, accessibility, collisionDetection }: any,
    ) => {
      mockHandlers = { onDragStart, onDragOver, onDragEnd, onDragCancel };
      mockAnnouncements = accessibility?.announcements;
      mockCollisionDetection = collisionDetection;
      return ReactModule.createElement('div', null, children);
    },
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

/** The dragged card's own open state, wherever the preview put it. */
const OpenState = () => {
  const { previewDecks } = useDeckDragPreview();
  const dragged = previewDecks.flatMap((entry) => entry.cards).find((entry) => entry.id === 'A');
  return <div data-testid="open-state">{dragged ? String(dragged.editorOpen) : 'none'}</div>;
};
const openState = () => screen.getByTestId('open-state').textContent;

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

/**
 * Let the focus attempts run. The retry chain is three animation frames deep, so
 * waiting on frames rather than a fixed delay keeps a late attempt from landing
 * in the next test when the machine is loaded.
 */
const settle = () =>
  act(async () => {
    await new Promise((resolve) => {
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            setTimeout(resolve, 50);
          })
        )
      );
    });
  });

const renderDrag = (
  decks: Deck[],
  onCardMove = jest.fn<void, [CardMove]>(),
  extra?: React.ReactNode,
  // The provider requires the caller to own the collapse; most tests only care
  // about the local preview, so the default asks for nothing.
  onCardDragStart: (cardId: string) => void = () => undefined,
) => {
  render(
    <DeckCardDragProvider decks={decks} onCardMove={onCardMove} onCardDragStart={onCardDragStart}>
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

  // A deck holding only a blank draft has nothing saved in it, so its header is
  // the drop target.
  it('drops a card into a draft-only deck at index 0 through its header', () => {
    const draft = emptyCard();
    const decks: Deck[] = [
      { id: 'd1', name: 'd1', cards: [card('A')] },
      { id: 'd2', name: 'd2', cards: [draft] },
    ];
    const onCardMove = jest.fn<void, [CardMove]>();
    renderDrag(decks, onCardMove, <DeckCardList deckId="d2" renderCard={() => null} />);

    dragStart('A');
    dragOver('A', 'deck:d2');
    expect(preview()).toEqual('d1: | d2:A');

    dragEnd('A', 'deck:d2');
    expect(onCardMove).toHaveBeenCalledTimes(1);
    expect(onCardMove).toHaveBeenCalledWith({ cardId: 'A', toDeckId: 'd2', toIndex: 0 });
    // Committed decks are never mutated; the draft is still there.
    expect(decks[1].cards).toEqual([draft]);
  });

  // A deck with no cards at all - no blank draft either - has no rows, so its
  // header is what takes a pointer drop, at position 1.
  it('drops a pointer drag into a deck with no cards through its header', () => {
    const decks = [deck('d1', ['A']), deck('d2', [])];
    const onCardMove = renderDrag(decks, undefined, <DeckCardList deckId="d2" renderCard={() => null} />);

    dragStart('A');
    dragOver('A', 'deck:d2');
    expect(preview()).toEqual('d1: | d2:A');
    expect(mockAnnouncements?.onDragOver?.({ active: { id: 'A' }, over: { id: 'deck:d2' } }))
      .toEqual('A moved over the empty deck d2.');

    dragEnd('A', 'deck:d2');
    expect(onCardMove).toHaveBeenCalledTimes(1);
    expect(onCardMove).toHaveBeenCalledWith({ cardId: 'A', toDeckId: 'd2', toIndex: 0 });
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
    const onCardMove = renderDrag(decks, undefined, <OpenState />);

    dragStart('A', keyboardEvent());
    dragOver('A', 'X', keyboardEvent());
    expect(preview()).toEqual('d1:B | d2:A,X');

    dragOver('A', 'deck:d1', keyboardEvent());
    expect(preview()).toEqual('d1:A,B | d2:X');
    // The restored tree is the one the drag started from, so the card is still
    // collapsed: what travelled is the compact card, not the form it came from.
    expect(openState()).toEqual('false');
    // The announcement must not claim a move to the deck the card is still in.
    expect(mockAnnouncements?.onDragOver?.({ active: { id: 'A' }, over: { id: 'deck:d1' } }))
      .toBeUndefined();

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

  // The card that moves is the real one, so an open card is collapsed into the
  // preview at drag start and the caller is told to collapse it in its state:
  // the row that travels is compact, and the drop leaves it collapsed.
  it('collapses an open card into the preview and asks the editor to persist it', () => {
    const onCardDragStart = jest.fn<void, [string]>();
    renderDrag([deck('d1', ['A']), deck('d2', ['X', 'Y'])], undefined, <OpenState />, onCardDragStart);
    expect(openState()).toEqual('true');

    dragStart('A');

    expect(openState()).toEqual('false');
    expect(onCardDragStart).toHaveBeenCalledTimes(1);
    expect(onCardDragStart).toHaveBeenCalledWith('A');

    // The collapse follows the card into another deck, and hovering does not
    // ask the editor again.
    dragOver('A', 'Y');
    expect(preview()).toEqual('d1: | d2:X,A,Y');
    expect(openState()).toEqual('false');

    dragEnd('A', 'Y');
    expect(onCardDragStart).toHaveBeenCalledTimes(1);
  });

  // An already collapsed card is not the editor's to collapse again: a drag of
  // it must not write anything, and a cancel must leave it collapsed.
  it('leaves a collapsed card alone and stays collapsed when the drag is cancelled', () => {
    const onCardDragStart = jest.fn<void, [string]>();
    const decks: Deck[] = [{ id: 'd1', name: 'd1', cards: [{ ...card('A'), editorOpen: false }] }];
    renderDrag(decks, undefined, <OpenState />, onCardDragStart);

    dragStart('A');
    expect(openState()).toEqual('false');
    expect(onCardDragStart).not.toHaveBeenCalled();

    dragCancel();
    expect(openState()).toEqual('false');
    expect(onCardDragStart).not.toHaveBeenCalled();
  });

  it('refuses to drag the blank draft card', () => {
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

// The editor's modal listens for Escape on the document and closes the whole
// editor. While a drag is active the drag owns that key: the provider marks it
// handled in the capture phase, so a listener registered earlier - as the
// modal's is - still sees it handled, whatever order the two registered in.
describe('Escape while a drag is active', () => {
  it('marks Escape handled only while a drag is active', () => {
    renderDrag([deck('d1', ['A']), deck('d2', ['X'])]);
    const seen: boolean[] = [];
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { seen.push(event.defaultPrevented); }
    };
    document.addEventListener('keydown', listener);

    const press = () => {
      const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true, bubbles: true });
      document.dispatchEvent(event);
      return event;
    };

    expect(press().defaultPrevented).toEqual(false);

    dragStart('A');
    expect(press().defaultPrevented).toEqual(true);

    dragEnd('A', null);
    expect(press().defaultPrevented).toEqual(false);
    expect(seen).toEqual([false, true, false]);
    document.removeEventListener('keydown', listener);
  });
});

// closestCorners has no distance limit, so without a gate a pointer released
// off the deck list still commits to the nearest row.
describe('releasing a pointer outside the deck list', () => {
  const outlineRect = {
    top: 0,
    right: 300,
    bottom: 100,
    left: 0,
    x: 0,
    y: 0,
    width: 300,
    height: 100,
    toJSON: () => ({}),
  } as DOMRect;

  // The gate measures the deck list, which the outline itself renders.
  const Outline = () => {
    const ref = React.useRef<HTMLElement>(null);
    React.useEffect(() => {
      if (ref.current) { ref.current.getBoundingClientRect = () => outlineRect; }
    }, []);
    return <section ref={ref} data-deck-outline="true" />;
  };

  const collisionArgs = (pointerCoordinates: { x: number; y: number; } | null) => ({
    active: { id: 'A' },
    collisionRect: outlineRect,
    droppableRects: new Map([['deck:d2', outlineRect]]),
    droppableContainers: [{ id: 'deck:d2' }],
    pointerCoordinates,
  });

  it('answers with no target outside the list, and leaves a keyboard drag alone', () => {
    renderDrag([deck('d1', ['A']), deck('d2', ['X'])], undefined, <Outline />);

    expect(mockCollisionDetection?.(collisionArgs({ x: 400, y: 400 }))).toEqual([]);
    expect(mockCollisionDetection?.(collisionArgs({ x: 100, y: 50 })))
      .toEqual([expect.objectContaining({ id: 'deck:d2' })]);
    // No pointer coordinates: the nearest droppable still wins, as it always did.
    expect(mockCollisionDetection?.(collisionArgs(null)))
      .toEqual([expect.objectContaining({ id: 'deck:d2' })]);
  });

  // The outline's own rect is the whole gate, with no margin: its edges are
  // inside, and a point past one is not. A release just off the list - ten
  // pixels, well inside the old slop - cancels.
  it('counts the exact edges as inside and a point past them as outside', () => {
    renderDrag([deck('d1', ['A']), deck('d2', ['X'])], undefined, <Outline />);
    const inside = [expect.objectContaining({ id: 'deck:d2' })];

    expect(mockCollisionDetection?.(collisionArgs({ x: 0, y: 0 }))).toEqual(inside);
    expect(mockCollisionDetection?.(collisionArgs({ x: 300, y: 100 }))).toEqual(inside);
    expect(mockCollisionDetection?.(collisionArgs({ x: 301, y: 50 }))).toEqual([]);
    expect(mockCollisionDetection?.(collisionArgs({ x: 310, y: 50 }))).toEqual([]);
    expect(mockCollisionDetection?.(collisionArgs({ x: 100, y: 101 }))).toEqual([]);
    expect(mockCollisionDetection?.(collisionArgs({ x: -1, y: 50 }))).toEqual([]);
  });

  // Leaving and coming back is not a cancel: the last collision is the one that
  // counts, so a drop made after the pointer returns commits and announces the
  // drop it made.
  it('commits a drop made after the pointer leaves and comes back', () => {
    const onCardMove = renderDrag([deck('d1', ['A']), deck('d2', ['X'])], undefined, <Outline />);

    dragStart('A');
    expect(mockCollisionDetection?.(collisionArgs({ x: 400, y: 400 }))).toEqual([]);
    // Back inside: the nearest droppable is the target again.
    expect(mockCollisionDetection?.(collisionArgs({ x: 100, y: 50 })))
      .toEqual([expect.objectContaining({ id: 'deck:d2' })]);
    dragOver('A', 'deck:d2');
    dragEnd('A', 'deck:d2');

    expect(onCardMove).toHaveBeenCalledTimes(1);
    expect(onCardMove).toHaveBeenCalledWith({ cardId: 'A', toDeckId: 'd2', toIndex: 1 });
    expect(mockAnnouncements?.onDragEnd?.({ active: { id: 'A' } })).toEqual('Dropped A at the end of d2.');
  });

  it('announces the release as a cancellation and moves nothing', () => {
    const onCardMove = renderDrag([deck('d1', ['A']), deck('d2', ['X'])], undefined, <Outline />);

    dragStart('A');
    mockCollisionDetection?.(collisionArgs({ x: 400, y: 400 }));
    dragEnd('A', null);

    expect(onCardMove).not.toHaveBeenCalled();
    expect(preview()).toEqual('d1:A | d2:X');
    expect(mockAnnouncements?.onDragEnd?.({ active: { id: 'A' } }))
      .toEqual('Drag cancelled. A stayed in d1.');
  });
});
