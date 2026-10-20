import {
  addCard,
  addDeck,
  clearError,
  decksFromSettings,
  deleteDeck,
  emptyCard,
  initialState,
  loaded,
  moveCard,
  removeCard,
  renameDeck,
  selectActiveCards,
  selectActiveDeck,
  selectDeck,
  setCardOpen,
  setDirty,
  setError,
  setList,
  setLoadError,
  stateFromSettings,
  updateCardField,
  updateSetting,
  updateType,
} from './gameTransitions';

describe('game state transitions', () => {
  it('marks state dirty on a card edit', () => {
    const next = updateCardField(initialState, { index: 0 }, 'term', 'x');
    expect(next.list[0].term).toEqual('x');
    expect(next.isDirty).toBe(true);
  });

  it('ignores an edit to a card that does not exist', () => {
    expect(updateCardField(initialState, { index: 99 }, 'term', 'x')).toBe(initialState);
  });

  it('adds and removes cards', () => {
    const added = addCard(initialState, emptyCard());
    expect(added.list).toHaveLength(2);
    expect(added.isDirty).toBe(true);
    const removed = removeCard(added, 0);
    expect(removed.list).toHaveLength(1);
  });

  // The id is what an upload targets later, so the view and the upload must
  // agree on it: one id per card, generated once.
  it('gives each added card its own id', () => {
    const twice = addCard(addCard(initialState), undefined);
    const ids = twice.list.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ignores an out-of-range removal', () => {
    expect(removeCard(initialState, 5)).toBe(initialState);
    expect(removeCard(initialState, -1)).toBe(initialState);
  });

  it('gives every new card the image-path fields the block persists', () => {
    expect(emptyCard()).toHaveProperty('term_image_path', '');
    expect(emptyCard()).toHaveProperty('definition_image_path', '');
  });

  it('marks state dirty on a setting or type change', () => {
    expect(updateSetting(initialState, 'shuffle', false)).toMatchObject({
      settings: { shuffle: false },
      isDirty: true,
    });
    expect(updateType(initialState, 'matching')).toMatchObject({ type: 'matching', isDirty: true });
  });

  it('replaces the state and clears errors when settings load', () => {
    const dirty = setError(updateType(initialState, 'matching'), new Error('old'));
    expect(dirty.isDirty).toBe(true);
    // The fetched value carries whatever was there before; loading resets it.
    const next = loaded({ ...dirty, type: 'flashcards' });
    expect(next).toMatchObject({ type: 'flashcards', isDirty: false, isLoaded: true, error: null });
  });

  // editorOpen is UI state: it is not saved, so changing it is not a change
  // to the game. It must not arm the discard prompt or enable a no-op save.
  it('does not mark the game dirty when a card is expanded or collapsed', () => {
    const state = { ...initialState, list: [emptyCard()], isDirty: false };
    const collapsed = setCardOpen(state, 0, false);
    expect(collapsed.list[0].editorOpen).toBe(false);
    expect(collapsed.isDirty).toBe(false);
    const stillDirty = setCardOpen({ ...state, isDirty: true }, 0, true);
    expect(stillDirty.isDirty).toBe(true);
  });

  it('ignores expanding or collapsing a card that does not exist', () => {
    expect(setCardOpen(initialState, 5, true)).toBe(initialState);
  });

  it('records and clears errors', () => {
    const failed = setError(initialState, new Error('boom'));
    expect(failed.error?.message).toEqual('boom');
    expect(failed.loadFailed).toBe(false);
    const loadFailed = setLoadError(initialState, new Error('down'));
    expect(loadFailed.loadFailed).toBe(true);
    expect(clearError(loadFailed)).toMatchObject({ error: null, loadFailed: false });
  });

  it('marks state dirty on demand', () => {
    expect(setDirty(initialState).isDirty).toBe(true);
  });

  it('replaces the list and marks state dirty', () => {
    const next = setList(initialState, []);
    expect(next.list).toEqual([]);
    expect(next.isDirty).toBe(true);
  });
});

describe('async card updates target the card, not its position', () => {
  it('updates by card id even after the list has been reordered', () => {
    const a = { ...emptyCard(), term: 'a' };
    const b = { ...emptyCard(), term: 'b' };
    const state = { ...initialState, list: [a, b] };
    // Request was issued for card "a" at index 0; by the time it settles the
    // list has been reversed, so index 0 is now "b".
    const reordered = setList(state, [b, a]);
    const next = updateCardField(reordered, { cardId: a.id }, 'term_image', 'u');
    expect(next.list[1].term).toEqual('a');
    expect(next.list[1].term_image).toEqual('u');
    expect(next.list[0].term_image).toBeFalsy();
  });

  it('drops an update for a card that no longer exists', () => {
    expect(updateCardField(initialState, { cardId: 'gone' }, 'term_image', 'u')).toBe(initialState);
  });
});

describe('decks', () => {
  const twoDecks = () =>
    decksFromSettings({
      decks: [
        { deck_key: 'dk-1', name: 'Basics', cards: [{ term: 'a', definition: 'b', card_key: 'c1' }] },
        { deck_key: 'dk-2', name: 'Advanced', cards: [] },
      ],
    });

  const stateWithTwoDecks = () => {
    const decks = twoDecks();
    return { ...initialState, decks, activeDeckId: decks[0].id, list: decks[0].cards };
  };

  // A backend that predates decks sends only `cards`; the editor must still
  // show one editable deck and save it back.
  it('loads one Deck 1 from a backend that sends no decks', () => {
    const state = stateFromSettings({ cards: [{ term: 't', definition: 'd', card_key: 'k' }] });

    expect(state.decks).toHaveLength(1);
    expect(state.decks[0]).toMatchObject({ name: 'Deck 1' });
    expect(state.decks[0].deck_key).toBeUndefined();
    expect(state.decks[0].cards[0]).toMatchObject({ term: 't', definition: 'd', card_key: 'k' });
    expect(state.activeDeckId).toEqual(state.decks[0].id);
    expect(state.list).toEqual(state.decks[0].cards);
    expect(state.isLoaded).toBe(true);
    expect(state.isDirty).toBe(false);
  });

  it('loads the decks the block returned, in order, with their keys', () => {
    const state = stateFromSettings({
      game_type: 'flashcards',
      decks: [
        { deck_key: 'dk-1', name: 'Basics', cards: [{ term: 'a', definition: 'b', card_key: 'c1' }] },
        { deck_key: 'dk-2', name: 'Advanced', cards: [] },
      ],
    });

    expect(state.decks.map((deck) => deck.name)).toEqual(['Basics', 'Advanced']);
    expect(state.decks.map((deck) => deck.deck_key)).toEqual(['dk-1', 'dk-2']);
    expect(state.activeDeckId).toEqual(state.decks[0].id);
    // Two decks loaded from one response must not share a local id.
    expect(new Set(state.decks.map((deck) => deck.id)).size).toEqual(2);
    // An empty deck is still editable: it gets a blank placeholder.
    expect(state.decks[1].cards).toHaveLength(1);
    expect(state.decks[1].cards[0].term).toEqual('');
  });

  // Switching decks is navigation, not a change to the game content.
  it('selects a deck without marking the state dirty', () => {
    const state = stateWithTwoDecks();
    const next = selectDeck(state, state.decks[1].id);

    expect(next.activeDeckId).toEqual(state.decks[1].id);
    expect(next.list).toEqual(state.decks[1].cards);
    expect(next.isDirty).toBe(false);
  });

  it('gives an empty deck a blank placeholder when it is selected', () => {
    const state = stateWithTwoDecks();
    const emptied = {
      ...state,
      decks: state.decks.map((deck, index) => (index === 1 ? { ...deck, cards: [] } : deck)),
    };
    expect(emptied.decks[1].cards).toEqual([]);

    const next = selectDeck(emptied, emptied.decks[1].id);

    expect(selectActiveCards(next)).toHaveLength(1);
    expect(selectActiveCards(next)[0].term).toEqual('');
    expect(next.isDirty).toBe(false);
  });

  it('adds a deck with a free name and starts editing it', () => {
    const state = stateWithTwoDecks();
    const next = addDeck(state);

    expect(next.decks.map((deck) => deck.name)).toEqual(['Basics', 'Advanced', 'Deck 3']);
    expect(next.activeDeckId).toEqual(next.decks[2].id);
    expect(selectActiveCards(next)).toHaveLength(1);
    expect(next.isDirty).toBe(true);
  });

  it('renames a deck', () => {
    const state = stateWithTwoDecks();
    const next = renameDeck(state, state.decks[1].id, 'Harder');

    expect(next.decks.map((deck) => deck.name)).toEqual(['Basics', 'Harder']);
    expect(next.activeDeckId).toEqual(state.activeDeckId);
    expect(next.isDirty).toBe(true);
  });

  it('never deletes the last deck', () => {
    expect(deleteDeck(initialState, initialState.decks[0].id)).toBe(initialState);
  });

  it('deletes a non-active deck and stays on the active one', () => {
    const state = stateWithTwoDecks();
    const active = selectDeck(state, state.decks[1].id);

    const next = deleteDeck(active, active.decks[0].id);

    expect(next.decks.map((deck) => deck.name)).toEqual(['Advanced']);
    expect(next.activeDeckId).toEqual(active.decks[1].id);
    expect(next.list).toEqual(active.decks[1].cards);
    expect(next.isDirty).toBe(true);
  });

  it('deletes a deck and edits a neighbour when it was active', () => {
    const state = stateWithTwoDecks();
    const next = deleteDeck(state, state.decks[0].id);

    expect(next.decks.map((deck) => deck.name)).toEqual(['Advanced']);
    expect(next.activeDeckId).toEqual(next.decks[0].id);
    expect(next.list).toEqual(next.decks[0].cards);
    expect(next.isDirty).toBe(true);
  });

  // The card object moves, so its id (uploads), card_key (the block's
  // identity) and images go with it.
  it('moves a card to another deck keeping its id, key and images', () => {
    const state = stateWithTwoDecks();
    const [card] = state.decks[0].cards;

    const next = moveCard(state, { cardId: card.id }, state.decks[1].id);

    expect(next.decks[0].cards).toEqual([]);
    expect(next.decks[1].cards).toEqual([card]);
    expect(next.decks[1].cards[0]).toMatchObject({ id: card.id, card_key: 'c1', term: 'a' });
    expect(next.isDirty).toBe(true);
  });

  it('ignores a move to the deck the card is already in', () => {
    const state = stateWithTwoDecks();
    expect(moveCard(state, { cardId: state.decks[0].cards[0].id }, state.decks[0].id)).toBe(state);
  });

  // The built-in editor edits and reorders the active deck's list; the other
  // decks must not move.
  it('edits, adds, removes and reorders only the active deck', () => {
    const state = stateWithTwoDecks();
    const active = selectDeck(state, state.decks[1].id);

    const edited = updateCardField(active, { index: 0 }, 'term', 'x');
    expect(selectActiveCards(edited)[0].term).toEqual('x');
    expect(edited.decks[0].cards[0].term).toEqual('a');
    // The rendered list is the active deck's cards, not a copy.
    expect(edited.list).toBe(selectActiveCards(edited));

    const added = addCard(active, { ...emptyCard(), term: 'new' });
    expect(selectActiveCards(added)).toHaveLength(2);
    expect(added.decks[0].cards).toHaveLength(1);

    const removed = removeCard(added, 0);
    expect(selectActiveCards(removed).map((card) => card.term)).toEqual(['new']);

    const reordered = setList(active, []);
    expect(selectActiveCards(reordered)).toEqual([]);
    expect(reordered.decks[0].cards).toHaveLength(1);
  });

  // An upload can settle after the author switched decks; the id still finds
  // the card, wherever it now is.
  it('updates a card by id even in a deck that is no longer active', () => {
    const state = stateWithTwoDecks();
    const cardId = state.decks[0].cards[0].id;
    const switched = selectDeck(state, state.decks[1].id);

    const next = updateCardField(switched, { cardId }, 'term_image', '/media/a.png');

    expect(next.decks[0].cards[0].term_image).toEqual('/media/a.png');
    expect(next.list).toEqual(switched.decks[1].cards);
  });

  it('exposes the deck being edited', () => {
    const state = stateWithTwoDecks();
    expect(selectActiveDeck(state)).toEqual(state.decks[0]);
    expect(selectActiveCards(state)).toEqual(state.decks[0].cards);
    expect(selectDeck(state, state.decks[1].id).decks[0].cards).toEqual(state.decks[0].cards);
  });
});

describe('backend deck capability and hardening', () => {
  const twoDecks = () =>
    decksFromSettings({
      decks: [
        { deck_key: 'dk-1', name: 'Basics', cards: [{ term: 'a', definition: 'b', card_key: 'c1' }] },
        { deck_key: 'dk-2', name: 'Advanced', cards: [{ term: 'c', definition: 'd', card_key: 'c2' }] },
      ],
    });

  const stateWithTwoDecks = () => {
    const decks = twoDecks();
    return { ...initialState, decks, activeDeckId: decks[0].id, list: decks[0].cards };
  };

  // The block only declares the field once it sends decks; an older block must
  // never be sent one.
  it('knows whether the backend declared decks', () => {
    expect(stateFromSettings({ cards: [] }).supportsDecks).toBe(false);
    expect(stateFromSettings({}).supportsDecks).toBe(false);
    expect(stateFromSettings({ decks: [] }).supportsDecks).toBe(true);
    expect(stateFromSettings({ decks: [{ name: 'A', cards: [] }] }).supportsDecks).toBe(true);
    // Transitions carry the capability with the state.
    expect(addDeck(stateFromSettings({ decks: [{ name: 'A', cards: [] }] })).supportsDecks).toBe(true);
  });

  // Matching is the flat game: it renders the primary deck only, so editing a
  // hidden secondary deck has to stop when the type changes.
  it('keeps every deck but selects the primary one when switching to matching', () => {
    const state = stateWithTwoDecks();
    const onSecondary = selectDeck(state, state.decks[1].id);

    const next = updateType(onSecondary, 'matching');

    expect(next.type).toEqual('matching');
    expect(next.activeDeckId).toEqual(next.decks[0].id);
    expect(next.list).toEqual(next.decks[0].cards);
    expect(next.decks).toHaveLength(2);
    expect(next.isDirty).toBe(true);
  });

  // A blank card the block already keyed is authored content: moving another
  // card into its deck must not quietly delete it.
  it('keeps an authored blank card when a card moves into its deck', () => {
    const authoredBlank = { ...emptyCard(), card_key: 'kb' };
    const decks = twoDecks();
    const state = {
      ...initialState,
      decks: [{ ...decks[0] }, { ...decks[1], cards: [authoredBlank] }],
      activeDeckId: decks[0].id,
      list: decks[0].cards,
    };

    const next = moveCard(state, { cardId: decks[0].cards[0].id }, decks[1].id);

    expect(next.decks[1].cards.map((card) => card.card_key)).toEqual(['kb', 'c1']);
  });

  it('does not move the active deck when switching back to flashcards', () => {
    const state = stateWithTwoDecks();
    const onSecondary = selectDeck(state, state.decks[1].id);

    expect(updateType(onSecondary, 'flashcards').activeDeckId).toEqual(state.decks[1].id);
  });

  // A caller with a bad deck list must not crash the editor.
  it('leaves the state alone when a transition would empty the deck list', () => {
    const state = { ...initialState, decks: [], list: [] };

    expect(() => setList(state, [emptyCard()])).not.toThrow();
    expect(setList(state, [emptyCard()]).decks).toEqual([]);
  });

  it('loads without crashing when decks or cards are not arrays', () => {
    const noDeckArray = stateFromSettings({ decks: {} } as never);
    expect(noDeckArray.decks).toHaveLength(1);
    expect(noDeckArray.decks[0].name).toEqual('Deck 1');

    const noCardArray = stateFromSettings({ cards: 'nope' } as never);
    expect(noCardArray.decks[0].cards).toHaveLength(1);
    expect(noCardArray.decks[0].cards[0].term).toEqual('');

    const junkDeck = stateFromSettings({ decks: [null] } as never);
    expect(junkDeck.decks).toHaveLength(1);
    expect(junkDeck.decks[0].name).toEqual('Deck 1');
    expect(junkDeck.decks[0].cards).toHaveLength(1);
  });
});
