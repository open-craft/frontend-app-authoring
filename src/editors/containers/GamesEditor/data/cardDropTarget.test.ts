import type { Card, Deck, GameState } from '@src/editors/containers/GamesEditor/types';
import { type CardDropOver, resolveCardDrop } from './cardDropTarget';
import { emptyCard, initialState, isBlankCard, moveCard } from './gameTransitions';

// A card's id is its name here, so every assertion reads as the card it names.
const card = (id: string): Card => ({ ...emptyCard(), id, term: id, card_key: `key-${id}` });
const deckWith = (id: string, ...cards: Card[]): Deck => ({ id, name: id, cards });
const deckOf = (id: string, ids: string[]): Deck => deckWith(id, ...ids.map(card));
const decks = () => [deckOf('cell', ['A', 'B', 'C']), deckOf('genetics', ['X', 'Y'])];

describe('resolveCardDrop', () => {
  it('drops before the hovered row when moving up', () => {
    expect(resolveCardDrop(decks(), 'C', { kind: 'card', deckId: 'cell', cardId: 'A' }))
      .toEqual({ deckId: 'cell', index: 0 });
    expect(resolveCardDrop(decks(), 'C', { kind: 'card', deckId: 'cell', cardId: 'B' }))
      .toEqual({ deckId: 'cell', index: 1 });
  });

  // The gap dnd-kit draws on a downward move is below the row being passed, and
  // a card moving down has already vacated its own position, so the -1 applies
  // once: A over B lands at 1 and A over C at 2.
  it('drops after the hovered row when moving down', () => {
    expect(resolveCardDrop(decks(), 'A', { kind: 'card', deckId: 'cell', cardId: 'B' }))
      .toEqual({ deckId: 'cell', index: 1 });
    expect(resolveCardDrop(decks(), 'A', { kind: 'card', deckId: 'cell', cardId: 'C' }))
      .toEqual({ deckId: 'cell', index: 2 });
  });

  it('appends after the hovered row of a later deck', () => {
    expect(resolveCardDrop(decks(), 'A', { kind: 'card', deckId: 'genetics', cardId: 'X' }))
      .toEqual({ deckId: 'genetics', index: 1 });
    // A over Y appends: deck2 stays in order and the card lands after it.
    expect(resolveCardDrop(decks(), 'A', { kind: 'card', deckId: 'genetics', cardId: 'Y' }))
      .toEqual({ deckId: 'genetics', index: 2 });
  });

  it('inserts before the hovered row of an earlier deck', () => {
    expect(resolveCardDrop(decks(), 'X', { kind: 'card', deckId: 'cell', cardId: 'A' }))
      .toEqual({ deckId: 'cell', index: 0 });
  });

  // An empty deck is drawn as its one blank placeholder and has no rows to aim
  // at, so its own drop zone is the deck header, and its only position is 0.
  it('drops an empty deck, drawn as one blank card, at index 0', () => {
    const withEmpty = [...decks(), deckWith('ecology', emptyCard())];
    expect(resolveCardDrop(withEmpty, 'A', { kind: 'deck', deckId: 'ecology' }))
      .toEqual({ deckId: 'ecology', index: 0 });
  });

  // Hovering a collapsed header must mean something before any of that deck's
  // rows exist, so it appends.
  it('appends when hovering a deck header', () => {
    expect(resolveCardDrop(decks(), 'A', { kind: 'deck', deckId: 'genetics' }))
      .toEqual({ deckId: 'genetics', index: 2 });
  });

  it('means nothing over the position the card already has', () => {
    expect(resolveCardDrop(decks(), 'A', { kind: 'card', deckId: 'cell', cardId: 'A' })).toBeNull();
    // Already the last card of its own deck, so its own header appends nowhere.
    expect(resolveCardDrop(decks(), 'C', { kind: 'deck', deckId: 'cell' })).toBeNull();
  });

  // A blank card is editor scaffolding with no content to move, so a drag never
  // starts from one; moveCard refuses it too, and this is the same rule.
  it('means nothing for a card that is only a blank placeholder', () => {
    const blank = emptyCard();
    const state = [deckWith('cell', blank), deckOf('genetics', ['X'])];
    expect(resolveCardDrop(state, blank.id, { kind: 'card', deckId: 'genetics', cardId: 'X' })).toBeNull();
    expect(resolveCardDrop(state, blank.id, { kind: 'deck', deckId: 'genetics' })).toBeNull();
  });

  it('means nothing without a target, or for an unknown card or deck', () => {
    expect(resolveCardDrop(decks(), 'A', null)).toBeNull();
    expect(resolveCardDrop(decks(), 'A', undefined)).toBeNull();
    expect(resolveCardDrop(decks(), 'nope', { kind: 'card', deckId: 'cell', cardId: 'B' })).toBeNull();
    expect(resolveCardDrop(decks(), 'A', { kind: 'deck', deckId: 'nope' })).toBeNull();
    expect(resolveCardDrop(decks(), 'A', { kind: 'card', deckId: 'cell', cardId: 'nope' })).toBeNull();
  });
});

// The resolver reports the index moveCard takes, so the two are composed here:
// an index that means one thing to the resolver and another to the transition
// would pass both of their own suites and fail only here.
describe('resolveCardDrop feeding moveCard', () => {
  const stateOf = (...deckList: Deck[]): GameState => ({
    ...initialState,
    decks: deckList,
    activeDeckId: deckList[0].id,
    list: deckList[0].cards,
  });
  const terms = (state: GameState, deckId: string) =>
    state.decks.find((deck) => deck.id === deckId)?.cards.map((entry) => entry.term);
  const drop = (state: GameState, cardId: string, over: CardDropOver): GameState => {
    const target = resolveCardDrop(state.decks, cardId, over);
    if (!target) { throw new Error(`no drop target for ${cardId}`); }
    return moveCard(state, cardId, target);
  };

  // The deck entered is drawn as [blank, X]. Hovering X from a later deck means
  // "before X", which is the blank's own position: the transition has to drop
  // the blank and leave the card where the author aimed.
  it('lands before the hovered row of a deck that starts with a blank card', () => {
    const state = stateOf(deckWith('cell', emptyCard(), card('X')), deckOf('genetics', ['A']));
    const next = drop(state, 'A', { kind: 'card', deckId: 'cell', cardId: 'X' });

    expect(terms(next, 'cell')).toEqual(['A', 'X']);
    expect(next.decks[0].cards.filter(isBlankCard)).toHaveLength(0);
  });

  it('lands after the hovered row of a deck that starts with a blank card', () => {
    const state = stateOf(deckOf('cell', ['A']), deckWith('genetics', emptyCard(), card('X')));
    expect(terms(drop(state, 'A', { kind: 'card', deckId: 'genetics', cardId: 'X' }), 'genetics'))
      .toEqual(['X', 'A']);
  });

  it('fills an empty deck', () => {
    const state = stateOf(deckOf('cell', ['A']), deckWith('ecology', emptyCard()));
    const over = { kind: 'deck', deckId: 'ecology' } as const;

    expect(resolveCardDrop(state.decks, 'A', over)).toEqual({ deckId: 'ecology', index: 0 });
    const next = drop(state, 'A', over);
    expect(terms(next, 'ecology')).toEqual(['A']);
    expect(terms(next, 'cell')).toEqual([]);
  });

  // The downward adjustment has to survive the composition too, not only the
  // resolver's own arithmetic.
  it('reorders inside one deck', () => {
    const state = stateOf(deckOf('cell', ['A', 'B', 'C']));
    expect(terms(drop(state, 'A', { kind: 'card', deckId: 'cell', cardId: 'B' }), 'cell'))
      .toEqual(['B', 'A', 'C']);
    expect(terms(drop(state, 'C', { kind: 'card', deckId: 'cell', cardId: 'A' }), 'cell'))
      .toEqual(['C', 'A', 'B']);
  });
});
