import React from 'react';
import userEvent from '@testing-library/user-event';
import {
  initializeMocks,
  render,
  screen,
  waitFor,
  within,
} from '@src/testUtils';
import { SortableItem } from '@src/generic/DraggableList';

import { emptyCard, initialState, moveCard } from '@src/editors/containers/GamesEditor/data/gameTransitions';
import type { Card, Deck } from '@src/editors/containers/GamesEditor/types';
import { stubRects, type StubbedRect } from '../testUtils/stubRects';
import {
  DeckCardDragProvider,
  DeckCardList,
  DeckDragHandle,
  DeckDragList,
  DeckDragRow,
  DeckDropTarget,
  type CardMove,
  type DeckMove,
} from './DeckCardDragContext';

// The real sensors run here: no DndContext, useDroppable or coordinate-getter
// mocks. jsdom has no layout, so the droppables get stubbed rects and the real
// keyboard coordinate getter uses them.

const card = (id: string, term: string): Card => ({ ...emptyCard(), id, term, card_key: 'key-' + id });
const deck = (id: string, name: string, cards: Card[] = []): Deck => ({ id, name, cards });

const applyMove = (decks: Deck[], move: CardMove): Deck[] => {
  const state = { ...initialState, decks, activeDeckId: decks[0].id, list: decks[0].cards };
  return moveCard(state, move.cardId, { deckId: move.toDeckId, index: move.toIndex }).decks;
};

/** The caller's half of a deck reorder: the stored order is what was dropped. */
const applyDeckMove = (decks: Deck[], move: DeckMove): Deck[] => {
  const from = decks.findIndex((entry) => entry.id === move.deckId);
  if (from < 0) { return decks; }
  const next = [...decks];
  const [moved] = next.splice(from, 1);
  next.splice(move.toIndex, 0, moved);
  return next;
};

const Harness = ({
  initialDecks,
  initiallyOpen,
  onCommit,
  onDeckCommit,
}: {
  initialDecks: Deck[];
  initiallyOpen: string[];
  /** Counts the card moves the provider reports, on top of applying them. */
  onCommit?: (move: CardMove) => void;
  /** Counts the deck reorders the provider reports, on top of applying them. */
  onDeckCommit?: (move: DeckMove) => void;
}) => {
  const [decks, setDecks] = React.useState(initialDecks);
  const [openDeckIds, setOpenDeckIds] = React.useState<ReadonlySet<string>>(() => new Set(initiallyOpen));
  const onCardMove = React.useCallback((move: CardMove) => {
    onCommit?.(move);
    setDecks((current) => applyMove(current, move));
  }, [onCommit]);
  const onDeckMove = React.useCallback((move: DeckMove) => {
    onDeckCommit?.(move);
    setDecks((current) => applyDeckMove(current, move));
  }, [onDeckCommit]);
  const openDeck = React.useCallback((deckId: string) => {
    setOpenDeckIds((previous) => new Set(previous).add(deckId));
  }, []);

  return (
    <>
      <div data-testid="committed">
        {decks.map((entry) => entry.id + ':' + entry.cards.map((item) => item.id).join(',')).join(' | ')}
      </div>
      <DeckCardDragProvider
        decks={decks}
        onCardMove={onCardMove}
        onDeckMove={onDeckMove}
        // These tests are about the drag layer, not the state it reports to.
        onCardDragStart={() => undefined}
      >
        <DeckDragList deckIds={decks.map((entry) => entry.id)}>
          {decks.map((entry, index) => (
            <DeckDragRow key={entry.id} deckId={entry.id}>
              <DeckDragHandle deckName={entry.name} position={index + 1} />
              <DeckDropTarget
                deckId={entry.id}
                isExpanded={openDeckIds.has(entry.id)}
                onRequestExpand={() => openDeck(entry.id)}
              >
                <h3>{entry.name}</h3>
              </DeckDropTarget>
              {openDeckIds.has(entry.id) && (
                <DeckCardList
                  deckId={entry.id}
                  renderCard={(_, item) => (
                    <SortableItem id={item.id} actions={null}>
                      <span>{item.term}</span>
                    </SortableItem>
                  )}
                />
              )}
            </DeckDragRow>
          ))}
        </DeckDragList>
      </DeckCardDragProvider>
    </>
  );
};

let restoreRects: (() => void) | undefined;

const useRects = (rects: Record<string, StubbedRect>) => {
  restoreRects = stubRects(rects);
};

const committed = () => screen.getByTestId('committed').textContent;
const liveRegion = () => screen.getByRole('status');

/** The row wrapper the module renders for a card or deck droppable. */
const row = (id: string): HTMLElement => {
  const found = Array.from(document.querySelectorAll<HTMLElement>('[data-dnd-id]'))
    .find((element) => element.dataset.dndId === id);
  if (!found) { throw new Error('No droppable row for ' + id); }
  return found;
};

const dragHandle = (cardId: string): HTMLElement =>
  within(row(cardId)).getByRole('button', { name: 'Drag to reorder' });

/** A deck row's own handle, named after the deck. */
const deckDragHandle = (deckName: string): HTMLElement => screen.getByRole('button', { name: 'Reorder ' + deckName });

const startDrag = async (user: ReturnType<typeof userEvent.setup>, cardId: string, key = ' ') => {
  dragHandle(cardId).focus();
  await user.keyboard(key);
  await waitFor(() => expect(liveRegion()).toHaveTextContent('Picked up'));
};

describe('DeckCardDragContext keyboard dragging', () => {
  beforeEach(() => {
    initializeMocks();
    restoreRects = undefined;
  });

  afterEach(() => {
    restoreRects?.();
  });

  it('reorders within a deck with the arrow keys and commits once', async () => {
    const user = userEvent.setup();
    const onCommit = jest.fn();
    const decks = [deck('d1', 'Cell Biology', [card('c1', 'Mitochondrion'), card('c2', 'Ribosome')])];
    useRects({ 'deck:d1': [0, 40], c1: [60, 100], c2: [120, 160] });
    render(<Harness initialDecks={decks} initiallyOpen={['d1']} onCommit={onCommit} />);

    await startDrag(user, 'c1');

    expect(liveRegion()).toHaveTextContent('Picked up Mitochondrion in Cell Biology.');
    // Names only: no raw ids (card or deck) reach a screen reader.
    expect(liveRegion()).not.toHaveTextContent(/\bc1\b|\bd1\b/);

    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(liveRegion()).toHaveTextContent('position 2 of Cell Biology'));

    await user.keyboard(' ');
    await waitFor(() => expect(committed()).toEqual('d1:c2,c1'));
    // One drop, one move.
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith({ cardId: 'c1', toDeckId: 'd1', toIndex: 1 });
    expect(liveRegion()).toHaveTextContent('at the end of Cell Biology');
    await waitFor(() => expect(dragHandle('c1')).toHaveFocus());
  });

  // The deck header sits above its own rows, so ArrowUp from the first card
  // reaches it. That must not be read as "move the card to the end".
  it('does not move a card to the end when the arrow reaches its own deck header', async () => {
    const user = userEvent.setup();
    const decks = [deck('d1', 'Cell Biology', [card('c1', 'Mitochondrion'), card('c2', 'Ribosome')])];
    useRects({ 'deck:d1': [0, 40], c1: [60, 100], c2: [120, 160] });
    render(<Harness initialDecks={decks} initiallyOpen={['d1']} />);

    await startDrag(user, 'c1');
    await user.keyboard('{ArrowUp}');
    await user.keyboard(' ');

    await waitFor(() => expect(liveRegion()).toHaveTextContent('Dropped Mitochondrion.'));
    expect(committed()).toEqual('d1:c1,c2');
    await waitFor(() => expect(dragHandle('c1')).toHaveFocus());
  });

  it('moves a card into another deck before the hovered row, focusing its new handle', async () => {
    const user = userEvent.setup();
    const onCommit = jest.fn();
    const decks = [
      deck('d1', 'Cell Biology', [card('c1', 'Mitochondrion')]),
      deck('d2', 'Genetics', [card('c2', 'Allele'), card('c3', 'Genome')]),
    ];
    useRects({
      'deck:d1': [0, 40],
      c1: [60, 100],
      'deck:d2': [120, 160],
      c2: [180, 220],
      c3: [240, 280],
    });
    render(<Harness initialDecks={decks} initiallyOpen={['d1', 'd2']} onCommit={onCommit} />);

    await startDrag(user, 'c1');

    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(liveRegion()).toHaveTextContent('moved over the end of Genetics'));

    // The first row of the later deck: the card lands before it, at position 1.
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(liveRegion()).toHaveTextContent('moved over position 1 of Genetics'));

    await user.keyboard(' ');
    await waitFor(() => expect(committed()).toEqual('d1: | d2:c1,c2,c3'));
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith({ cardId: 'c1', toDeckId: 'd2', toIndex: 0 });
    expect(liveRegion()).toHaveTextContent('Dropped Mitochondrion at position 1 of Genetics.');
    // The drop announcement names the card and decks, never their ids.
    expect(liveRegion()).not.toHaveTextContent(/\bc1\b|\bd1\b|\bd2\b/);

    await waitFor(() => expect(dragHandle('c1')).toHaveFocus());
    expect(row('c1').closest('[data-dnd-id="deck-row:d2"]')).toHaveTextContent('Genetics');
  });

  // The header appends, so the second row is how a middle position is reached.
  it('inserts into the middle of another deck with the arrow keys', async () => {
    const user = userEvent.setup();
    const onCommit = jest.fn();
    const decks = [
      deck('d1', 'Cell Biology', [card('c1', 'Mitochondrion')]),
      deck('d2', 'Genetics', [card('c2', 'Allele'), card('c3', 'Genome')]),
    ];
    useRects({
      'deck:d1': [0, 40],
      c1: [60, 100],
      'deck:d2': [120, 160],
      c2: [180, 220],
      c3: [240, 280],
    });
    render(<Harness initialDecks={decks} initiallyOpen={['d1', 'd2']} onCommit={onCommit} />);

    await startDrag(user, 'c1');

    // Header, then the first row, then the second.
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(liveRegion()).toHaveTextContent('moved over the end of Genetics'));
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(liveRegion()).toHaveTextContent('moved over position 1 of Genetics'));
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(liveRegion()).toHaveTextContent('moved over position 2 of Genetics'));

    await user.keyboard(' ');
    await waitFor(() => expect(committed()).toEqual('d1: | d2:c2,c1,c3'));
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith({ cardId: 'c1', toDeckId: 'd2', toIndex: 1 });
    expect(liveRegion()).toHaveTextContent('Dropped Mitochondrion at position 2 of Genetics.');
    await waitFor(() => expect(dragHandle('c1')).toHaveFocus());
  });

  it('opens a collapsed deck on hover and appends the card to it', async () => {
    const user = userEvent.setup();
    const decks = [
      deck('d1', 'Cell Biology', [card('c1', 'Mitochondrion')]),
      deck('d2', 'Genetics', [card('c2', 'Allele'), card('c3', 'Genome')]),
    ];
    // The collapsed deck has no card rows, so only its header is a target.
    useRects({ 'deck:d1': [0, 40], c1: [60, 100], 'deck:d2': [120, 160] });
    render(<Harness initialDecks={decks} initiallyOpen={['d1']} />);

    await startDrag(user, 'c1');

    await user.keyboard('{ArrowDown}');
    // Hovering the header asks the outline to open it.
    await waitFor(() => expect(screen.getByText('Allele')).toBeInTheDocument());
    await waitFor(() => expect(liveRegion()).toHaveTextContent('moved over the end of Genetics'));

    await user.keyboard(' ');
    await waitFor(() => expect(committed()).toEqual('d1: | d2:c2,c3,c1'));
    expect(liveRegion()).toHaveTextContent('at the end of Genetics');
    await waitFor(() => expect(dragHandle('c1')).toHaveFocus());
  });

  it('drops a card into an empty deck through its header', async () => {
    const user = userEvent.setup();
    const decks = [
      deck('d1', 'Cell Biology', [card('c1', 'Mitochondrion')]),
      deck('d2', 'Ecology', []),
    ];
    // The empty deck has no rows: its header is the target.
    useRects({ 'deck:d1': [0, 40], c1: [60, 100], 'deck:d2': [120, 160] });
    render(<Harness initialDecks={decks} initiallyOpen={['d1', 'd2']} />);

    await startDrag(user, 'c1');

    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(liveRegion()).toHaveTextContent('moved over the empty deck Ecology'));

    await user.keyboard(' ');
    await waitFor(() => expect(committed()).toEqual('d1: | d2:c1'));
    expect(liveRegion()).toHaveTextContent('in the empty deck Ecology');
    await waitFor(() => expect(dragHandle('c1')).toHaveFocus());
  });

  // A deck holding [blank draft, card] has one slot in front of that card. The
  // transition's index is measured before the draft is dropped, so hover and
  // drop have to report the position the card ends up in, not the index they
  // passed in.
  it('drops and announces the same position in a deck with a blank draft', async () => {
    const user = userEvent.setup();
    const draft = emptyCard();
    const decks = [
      deck('d1', 'Cell Biology', [card('c1', 'Mitochondrion')]),
      { id: 'd2', name: 'Genetics', cards: [draft, card('c2', 'Allele')] },
    ];
    useRects({
      'deck:d1': [0, 40],
      c1: [60, 100],
      'deck:d2': [120, 160],
      [draft.id]: [180, 220],
      c2: [240, 280],
    });
    render(<Harness initialDecks={decks} initiallyOpen={['d1', 'd2']} />);

    await startDrag(user, 'c1');
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(liveRegion()).toHaveTextContent('moved over the end of Genetics'));

    // The blank draft is not a position of its own: both rows land at 1.
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(liveRegion()).toHaveTextContent('moved over position 1 of Genetics'));
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(liveRegion()).toHaveTextContent('moved over position 1 of Genetics'));

    await user.keyboard(' ');
    await waitFor(() => expect(committed()).toEqual('d1: | d2:c1,c2'));
    expect(liveRegion()).toHaveTextContent('Dropped Mitochondrion at position 1 of Genetics.');
    await waitFor(() => expect(dragHandle('c1')).toHaveFocus());
  });

  it('cancels with Escape, leaving the deck unchanged and focus where it started', async () => {
    const user = userEvent.setup();
    const decks = [deck('d1', 'Cell Biology', [card('c1', 'Mitochondrion'), card('c2', 'Ribosome')])];
    useRects({ 'deck:d1': [0, 40], c1: [60, 100], c2: [120, 160] });
    render(<Harness initialDecks={decks} initiallyOpen={['d1']} />);

    // Enter starts a drag as well as Space.
    await startDrag(user, 'c1', '{Enter}');
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(liveRegion()).toHaveTextContent('position 2 of Cell Biology'));

    await user.keyboard('{Escape}');

    await waitFor(() => expect(liveRegion()).toHaveTextContent('Drag cancelled.'));
    expect(liveRegion()).toHaveTextContent('Mitochondrion stayed in Cell Biology');
    expect(liveRegion()).not.toHaveTextContent(/\bc1\b|\bc2\b|\bd1\b/);
    expect(committed()).toEqual('d1:c1,c2');
    await waitFor(() => expect(dragHandle('c1')).toHaveFocus());
  });

  // The editor's modal listens for Escape on the document. A listener that was
  // registered before dnd-kit's - as the modal's is, on mount - must already
  // see the event as handled, or it closes the whole editor.
  it('marks Escape handled before an earlier document listener sees it', async () => {
    const user = userEvent.setup();
    const decks = [deck('d1', 'Cell Biology', [card('c1', 'Mitochondrion')])];
    useRects({ 'deck:d1': [0, 40], c1: [60, 100] });
    render(<Harness initialDecks={decks} initiallyOpen={['d1']} />);

    const seen: boolean[] = [];
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { seen.push(event.defaultPrevented); }
    };
    document.addEventListener('keydown', listener);

    await startDrag(user, 'c1');
    await user.keyboard('{Escape}');
    document.removeEventListener('keydown', listener);

    expect(seen).toEqual([true]);
    await waitFor(() => expect(liveRegion()).toHaveTextContent('Drag cancelled.'));
  });
});

// The Escape listener is the provider's, not the keyboard sensor's: a pointer
// drag started by the real PointerSensor has to cancel on it too, or the
// editor's modal closes over a drag still in flight. jsdom has no PointerEvent
// of its own, but user-event supplies one and stubRects the layout, so the
// sensor runs for real rather than through a mock.
describe('DeckCardDragContext pointer dragging', () => {
  beforeEach(() => {
    initializeMocks();
    restoreRects = undefined;
  });

  afterEach(() => {
    restoreRects?.();
  });

  it('cancels a pointer drag with Escape, leaving the deck unchanged', async () => {
    const user = userEvent.setup();
    const onCommit = jest.fn();
    const decks = [deck('d1', 'Cell Biology', [card('c1', 'Mitochondrion'), card('c2', 'Ribosome')])];
    useRects({ 'deck:d1': [0, 40], c1: [60, 100], c2: [120, 160] });
    render(<Harness initialDecks={decks} initiallyOpen={['d1']} onCommit={onCommit} />);

    const handle = dragHandle('c1');
    // Press on the handle, then move past the sensor's 8px activation distance.
    await user.pointer([
      { target: handle, keys: '[MouseLeft>]' },
      { target: handle, coords: { x: 400, y: 95 } },
    ]);
    await waitFor(() => expect(liveRegion()).toHaveTextContent('Picked up Mitochondrion in Cell Biology.'));

    await user.keyboard('{Escape}');

    await waitFor(() => expect(liveRegion()).toHaveTextContent('Drag cancelled.'));
    expect(liveRegion()).toHaveTextContent('Mitochondrion stayed in Cell Biology');
    expect(committed()).toEqual('d1:c1,c2');
    expect(onCommit).not.toHaveBeenCalled();

    // Let go of a button the cancelled sensor no longer listens for.
    await user.pointer({ keys: '[/MouseLeft]' });
  });
});

// Two decks, one list: the rows are the decks themselves, so a reorder moves the
// real row and the stored order is what was dropped.
/**
 * A deck row's two boxes live on different elements: the wrapper is what moves,
 * while the row's droppable - and a card's deck target - is the header inside
 * it. The wrapper contains its header and cards, as the real row does; only
 * the heights are short.
 */
const deckRects = (withCards: boolean): Record<string, StubbedRect> => ({
  'deck-row:d1': [0, withCards ? 200 : 40],
  'deck:d1': [0, 40],
  ...(withCards ? { c1: [60, 100] } : {}),
  'deck-row:d2': [withCards ? 220 : 60, withCards ? 420 : 100],
  'deck:d2': [withCards ? 220 : 60, withCards ? 260 : 100],
  ...(withCards ? { c2: [280, 320] } : {}),
});

const deckDragDecks = () => [
  deck('d1', 'Cell Biology', [card('c1', 'Mitochondrion')]),
  deck('d2', 'Genetics', [card('c2', 'Allele')]),
];

describe('DeckCardDragContext deck dragging', () => {
  beforeEach(() => {
    initializeMocks();
    restoreRects = undefined;
  });

  afterEach(() => {
    restoreRects?.();
  });

  it('reorders the decks with the keyboard and focuses the moved handle', async () => {
    const user = userEvent.setup();
    const onDeckCommit = jest.fn();
    useRects(deckRects(true));
    render(<Harness initialDecks={deckDragDecks()} initiallyOpen={['d1', 'd2']} onDeckCommit={onDeckCommit} />);

    // Enter starts a drag as well as Space.
    deckDragHandle('Cell Biology').focus();
    await user.keyboard('{Enter}');
    await waitFor(() =>
      expect(liveRegion()).toHaveTextContent('Picked up Cell Biology at position 1 of the deck list.')
    );

    // Arrows walk deck rows only: no card row is ever a step.
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(liveRegion()).toHaveTextContent('Cell Biology moved over position 2 of the deck list.'));

    await user.keyboard(' ');
    await waitFor(() => expect(committed()).toEqual('d2:c2 | d1:c1'));
    expect(onDeckCommit).toHaveBeenCalledTimes(1);
    expect(onDeckCommit).toHaveBeenCalledWith({ deckId: 'd1', toIndex: 1 });
    expect(liveRegion()).toHaveTextContent('Dropped Cell Biology at position 2 of the deck list.');
    // Names and positions only: no deck or card ids reach a screen reader.
    expect(liveRegion()).not.toHaveTextContent(/\bd1\b|\bd2\b|c1|c2/);
    await waitFor(() => expect(deckDragHandle('Cell Biology')).toHaveFocus());
  });

  // Only the handle starts a deck drag: a press on the row itself, name and
  // cards included, leaves the order alone.
  it('does not start a deck drag from the row itself', async () => {
    const user = userEvent.setup();
    const onDeckCommit = jest.fn();
    useRects(deckRects(true));
    render(<Harness initialDecks={deckDragDecks()} initiallyOpen={['d1', 'd2']} onDeckCommit={onDeckCommit} />);

    await user.pointer([
      { target: screen.getByText('Cell Biology'), keys: '[MouseLeft>]' },
      { target: screen.getByText('Cell Biology'), coords: { x: 400, y: 200 } },
    ]);
    expect(liveRegion()).not.toHaveTextContent('Picked up');
    await user.pointer({ keys: '[/MouseLeft]' });

    expect(onDeckCommit).not.toHaveBeenCalled();
    expect(committed()).toEqual('d1:c1 | d2:c2');
  });

  it('reorders the decks with the pointer, from the handle', async () => {
    const user = userEvent.setup();
    const onDeckCommit = jest.fn();
    useRects(deckRects(true));
    render(<Harness initialDecks={deckDragDecks()} initiallyOpen={['d1', 'd2']} onDeckCommit={onDeckCommit} />);

    const handle = deckDragHandle('Cell Biology');
    // Press on the handle and move past the sensor's 8px activation distance: the
    // first move only picks the row up.
    await user.pointer([
      { target: handle, keys: '[MouseLeft>]' },
      { target: handle, coords: { x: 400, y: 100 } },
    ]);
    await waitFor(() =>
      expect(liveRegion()).toHaveTextContent('Picked up Cell Biology at position 1 of the deck list.')
    );

    // The next move carries the real row onto the second one.
    await user.pointer([{ target: handle, coords: { x: 400, y: 200 } }]);
    await waitFor(() => expect(liveRegion()).toHaveTextContent('Cell Biology moved over position 2 of the deck list.'));
    // The real row is what travels, not a copy: it is marked and translated.
    expect(row('deck-row:d1')).toHaveAttribute('data-dnd-dragging', 'true');
    expect(row('deck-row:d1').style.transform).toContain('translate3d(');

    await user.pointer([{ keys: '[/MouseLeft]' }]);

    await waitFor(() => expect(committed()).toEqual('d2:c2 | d1:c1'));
    expect(onDeckCommit).toHaveBeenCalledTimes(1);
    expect(onDeckCommit).toHaveBeenCalledWith({ deckId: 'd1', toIndex: 1 });
  });

  // A deck with its cards open is a tall row - far taller than the gap it moves
  // to. It is aimed by its header, so one modest drag reaches the deck below,
  // instead of having to drag past the row's own height.
  it('reorders an expanded deck with a modest pointer move and keeps it open', async () => {
    const user = userEvent.setup();
    const onDeckCommit = jest.fn();
    // Deck 1 open: its row is 300px tall, its header and cards inside it.
    useRects({
      'deck-row:d1': [0, 300],
      'deck:d1': [10, 50],
      c1: [70, 110],
      c2: [130, 170],
      'deck-row:d2': [320, 620],
      'deck:d2': [330, 370],
    });
    render(
      <Harness
        initialDecks={[
          deck('d1', 'Cell Biology', [card('c1', 'Mitochondrion'), card('c2', 'Ribosome')]),
          deck('d2', 'Genetics', []),
        ]}
        initiallyOpen={['d1', 'd2']}
        onDeckCommit={onDeckCommit}
      />,
    );
    expect(screen.getByText('Mitochondrion')).toBeInTheDocument();

    const handle = deckDragHandle('Cell Biology');
    await user.pointer([
      { target: handle, keys: '[MouseLeft>]' },
      { target: handle, coords: { x: 400, y: 100 } },
    ]);
    await waitFor(() =>
      expect(liveRegion()).toHaveTextContent('Picked up Cell Biology at position 1 of the deck list.')
    );

    // The header is 50px tall inside a 300px row: 130px of travel is well inside
    // the row, and already over Genetics.
    await user.pointer([{ target: handle, coords: { x: 400, y: 160 } }]);
    await waitFor(() => expect(liveRegion()).toHaveTextContent('Cell Biology moved over position 2 of the deck list.'));

    await user.pointer({ keys: '[/MouseLeft]' });

    await waitFor(() => expect(committed()).toEqual('d2: | d1:c1,c2'));
    expect(onDeckCommit).toHaveBeenCalledTimes(1);
    expect(onDeckCommit).toHaveBeenCalledWith({ deckId: 'd1', toIndex: 1 });
    // The row moved open: its cards are still its cards, still on screen.
    expect(screen.getByText('Mitochondrion')).toBeInTheDocument();
    expect(screen.getByText('Ribosome')).toBeInTheDocument();
  });

  it('cancels a pointer deck drag with Escape, leaving the order alone', async () => {
    const user = userEvent.setup();
    const onDeckCommit = jest.fn();
    useRects(deckRects(true));
    render(<Harness initialDecks={deckDragDecks()} initiallyOpen={['d1', 'd2']} onDeckCommit={onDeckCommit} />);

    const handle = deckDragHandle('Cell Biology');
    await user.pointer([
      { target: handle, keys: '[MouseLeft>]' },
      { target: handle, coords: { x: 400, y: 200 } },
    ]);
    await waitFor(() =>
      expect(liveRegion()).toHaveTextContent('Picked up Cell Biology at position 1 of the deck list.')
    );

    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(liveRegion()).toHaveTextContent('Drag cancelled. Cell Biology stayed at position 1 of the deck list.')
    );
    expect(committed()).toEqual('d1:c1 | d2:c2');
    expect(onDeckCommit).not.toHaveBeenCalled();
    await user.pointer({ keys: '[/MouseLeft]' });
  });
});
