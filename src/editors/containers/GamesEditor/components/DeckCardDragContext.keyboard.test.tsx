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
  DeckDropTarget,
  type CardMove,
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

const Harness = ({
  initialDecks,
  initiallyOpen,
  onCommit,
}: {
  initialDecks: Deck[];
  initiallyOpen: string[];
  /** Counts the moves the provider reports, on top of applying them. */
  onCommit?: (move: CardMove) => void;
}) => {
  const [decks, setDecks] = React.useState(initialDecks);
  const [openDeckIds, setOpenDeckIds] = React.useState<ReadonlySet<string>>(() => new Set(initiallyOpen));
  const onCardMove = React.useCallback((move: CardMove) => {
    onCommit?.(move);
    setDecks((current) => applyMove(current, move));
  }, [onCommit]);
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
        renderOverlayCard={(item) => <div data-dnd-id={item.id}>{item.term}</div>}
      >
        {decks.map((entry) => (
          <section key={entry.id}>
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
          </section>
        ))}
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

  it('moves a card into another deck, focusing its new handle', async () => {
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

    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(liveRegion()).toHaveTextContent('position 1 of Genetics'));

    await user.keyboard(' ');
    await waitFor(() => expect(committed()).toEqual('d1: | d2:c2,c1,c3'));
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith({ cardId: 'c1', toDeckId: 'd2', toIndex: 1 });
    expect(liveRegion()).toHaveTextContent('Dropped Mitochondrion at position 2 of Genetics.');
    // The drop announcement names the card and decks, never their ids.
    expect(liveRegion()).not.toHaveTextContent(/\bc1\b|\bd1\b|\bd2\b/);

    await waitFor(() => expect(dragHandle('c1')).toHaveFocus());
    expect(row('c1').closest('section')).toHaveTextContent('Genetics');
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

  it('drops a card into an expanded empty deck at position one', async () => {
    const user = userEvent.setup();
    const decks = [
      deck('d1', 'Cell Biology', [card('c1', 'Mitochondrion')]),
      deck('d2', 'Ecology', []),
    ];
    useRects({
      'deck:d1': [0, 40],
      c1: [60, 100],
      'deck:d2': [120, 160],
      'deck:d2:empty': [180, 220],
    });
    render(<Harness initialDecks={decks} initiallyOpen={['d1', 'd2']} />);

    await startDrag(user, 'c1');

    await user.keyboard('{ArrowDown}');
    // The preview moved the card out of Deck 1, which now shows its empty zone.
    await waitFor(() => expect(row('deck:d1:empty')).toBeInTheDocument());

    await user.keyboard(' ');
    await waitFor(() => expect(committed()).toEqual('d1: | d2:c1'));
    expect(liveRegion()).toHaveTextContent('in the empty deck Ecology');
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
});
