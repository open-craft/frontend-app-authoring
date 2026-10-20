import { v4 as uuidv4 } from 'uuid';

import type {
  Card,
  Deck,
  GameSettings,
  GameState,
  GameType,
  SettingsDeck,
  SettingsResponse,
} from '@src/editors/containers/GamesEditor/types';

/**
 * Pure transitions on the editor's state. Each returns a new state, or the
 * same object when there is nothing to change. `useGameState` applies them
 * through its store; they are kept apart so they can be tested on their own.
 */

/** The name given to a block's only deck when it loads no decks of its own. */
export const DEFAULT_DECK_NAME = 'Deck 1';

export const emptyCard = (): Card => ({
  id: uuidv4(),
  term: '',
  term_image: '',
  term_image_path: '',
  term_image_alt: '',
  definition: '',
  definition_image: '',
  definition_image_path: '',
  definition_image_alt: '',
  editorOpen: true,
});

/** A new, empty, editable deck: one blank placeholder, which is never saved. */
export const newDeck = (name: string): Deck => ({ id: uuidv4(), name, cards: [emptyCard()] });

const initialDeck = newDeck(DEFAULT_DECK_NAME);

export const initialState: GameState = {
  settings: { shuffle: true, timer: true },
  type: 'flashcards',
  decks: [initialDeck],
  activeDeckId: initialDeck.id,
  // Until `get_settings` says otherwise, assume a block that does not know decks.
  supportsDecks: false,
  // Compatibility view of the active deck's cards; every deck transition
  // refreshes it from `decks`.
  list: initialDeck.cards,
  isDirty: false,
  isLoaded: false,
  // Any failed request (load, save, image upload). Rendered by the editor.
  error: null,
  // True when the settings fetch itself failed, so the editor can offer a
  // retry instead of a spinner that never ends.
  loadFailed: false,
};

export type CardField = Exclude<keyof Card, 'id'>;

/**
 * Which card an edit targets. Synchronous edits name a position. Async work
 * (an image upload) names the card's id, because its position may have
 * changed by the time the request settles and the author may have switched
 * decks since.
 */
export type CardTarget = { index: number; cardId?: undefined; } | { cardId: string; index?: undefined; };

/** Position of the active deck, or 0 if the id no longer names one. */
export const activeDeckIndex = (state: GameState): number => {
  const index = state.decks.findIndex((deck) => deck.id === state.activeDeckId);
  return index < 0 ? 0 : index;
};

/** Stand-in for a state with no decks, which no transition can produce. */
const NO_DECK: Deck = { id: '', name: DEFAULT_DECK_NAME, cards: [] };

/** The deck being edited; an empty deck list has nothing to edit. */
export const selectActiveDeck = (state: GameState): Deck => state.decks[activeDeckIndex(state)] || NO_DECK;

/** The active deck's cards; what the built-in editor renders. */
export const selectActiveCards = (state: GameState): Card[] => selectActiveDeck(state).cards;

/**
 * State with `decks` replaced, activating `activeDeckId` when it still names a
 * deck and refreshing the `list` compatibility view.
 */
const withDecks = (state: GameState, decks: Deck[], activeDeckId: string = state.activeDeckId): GameState => {
  // A block always has at least one deck; an empty list is a bad caller, not a
  // state to move to, so it leaves the current decks alone.
  if (!decks.length) { return state; }
  const active = decks.find((deck) => deck.id === activeDeckId) || decks[0];
  return { ...state, decks, activeDeckId: active.id, list: active.cards };
};

/** Where a target points: a deck's position and a card's position in it. */
const locate = (state: GameState, target: CardTarget): { deck: number; card: number; } | null => {
  const { cardId, index } = target;
  if (cardId != null) {
    const deck = state.decks.findIndex((candidate) => candidate.cards.some((card) => card.id === cardId));
    if (deck < 0) { return null; }
    return { deck, card: state.decks[deck].cards.findIndex((card) => card.id === cardId) };
  }
  const deck = activeDeckIndex(state);
  if (!state.decks[deck] || !state.decks[deck].cards[index]) { return null; }
  return { deck, card: index };
};

/** Applies `update` to one located card, leaving every other card alone. */
const mapCard = (state: GameState, at: { deck: number; card: number; }, update: (card: Card) => Card): GameState => (
  withDecks(
    state,
    state.decks.map((deck, deckIndex) => (
      deckIndex === at.deck
        ? { ...deck, cards: deck.cards.map((card, cardIndex) => (cardIndex === at.card ? update(card) : card)) }
        : deck
    )),
  )
);

export const updateSetting = (state: GameState, key: keyof GameSettings, value: boolean): GameState => ({
  ...state,
  settings: { ...state.settings, [key]: value },
  isDirty: true,
});

export const updateType = (state: GameState, value: GameType): GameState => {
  // Matching is the flat game and renders only the primary deck, so the editor
  // must not stay on a deck Matching will not show. Every deck is kept.
  if (value === 'matching') {
    const primaryDeckId = state.decks[0]?.id ?? state.activeDeckId;
    return { ...withDecks(state, state.decks, primaryDeckId), type: value, isDirty: true };
  }
  return { ...state, type: value, isDirty: true };
};

export const updateCardField = (
  state: GameState,
  target: CardTarget,
  field: CardField,
  value: string | boolean,
): GameState => {
  const at = locate(state, target);
  if (!at) { return state; }
  return { ...mapCard(state, at, (card) => ({ ...card, [field]: value })), isDirty: true };
};

// UI only: whether a card is expanded. Not saved, so not a change to the game.
export const setCardOpen = (state: GameState, index: number, isOpen: boolean): GameState => {
  const at = locate(state, { index });
  if (!at) { return state; }
  return mapCard(state, at, (card) => ({ ...card, editorOpen: isOpen }));
};

/** Replaces the active deck's cards, e.g. after a drag reorder. */
export const setList = (state: GameState, list: Card[]): GameState => ({
  ...withDecks(
    state,
    state.decks.map((deck, index) => (index === activeDeckIndex(state) ? { ...deck, cards: list } : deck)),
  ),
  isDirty: true,
});

export const addCard = (state: GameState, card: Card = emptyCard()): GameState => {
  const active = selectActiveDeck(state);
  return {
    ...withDecks(
      state,
      state.decks.map((deck) => (
        deck.id === active.id ? { ...deck, cards: [...deck.cards, card] } : deck
      )),
    ),
    isDirty: true,
  };
};

export const removeCard = (state: GameState, index: number): GameState => {
  const cards = selectActiveCards(state);
  if (index < 0 || index >= cards.length) { return state; }
  const active = selectActiveDeck(state);
  return {
    ...withDecks(
      state,
      state.decks.map((deck) => (
        deck.id === active.id ? { ...deck, cards: deck.cards.filter((_, cardIndex) => cardIndex !== index) } : deck
      )),
    ),
    isDirty: true,
  };
};

/**
 * Switches the deck being edited. Navigation, not a change to the game, so it
 * does not mark the state dirty. An empty deck gets a blank placeholder so it
 * can be edited; placeholders are filtered out of a save.
 */
export const selectDeck = (state: GameState, deckId: string): GameState => {
  const deck = state.decks.find((candidate) => candidate.id === deckId);
  if (!deck || deck.id === state.activeDeckId) { return state; }
  const editable = deck.cards.length ? deck : { ...deck, cards: [emptyCard()] };
  return withDecks(state, state.decks.map((candidate) => (candidate.id === deckId ? editable : candidate)), deckId);
};

/** The next free "Deck N" name, so a new deck does not start out invalid. */
const nextDeckName = (decks: Deck[]): string => {
  const names = new Set(decks.map((deck) => deck.name.trim().toLowerCase()));
  let number = decks.length + 1;
  while (names.has(`deck ${number}`)) { number += 1; }
  return `Deck ${number}`;
};

/** Appends a new deck and edits it. */
export const addDeck = (state: GameState, name: string = nextDeckName(state.decks)): GameState => {
  const deck = newDeck(name);
  return { ...withDecks(state, [...state.decks, deck], deck.id), isDirty: true };
};

/** Deck names are validated (required, unique ignoring case) before a save. */
export const renameDeck = (state: GameState, deckId: string, name: string): GameState => {
  if (!state.decks.some((deck) => deck.id === deckId)) { return state; }
  return {
    ...withDecks(state, state.decks.map((deck) => (deck.id === deckId ? { ...deck, name } : deck))),
    isDirty: true,
  };
};

/** Removes a deck and its cards. The last deck cannot be deleted. */
export const deleteDeck = (state: GameState, deckId: string): GameState => {
  const index = state.decks.findIndex((deck) => deck.id === deckId);
  if (index < 0 || state.decks.length <= 1) { return state; }
  const decks = state.decks.filter((deck) => deck.id !== deckId);
  const activeDeckId = deckId === state.activeDeckId
    ? decks[Math.min(index, decks.length - 1)].id
    : state.activeDeckId;
  return { ...withDecks(state, decks, activeDeckId), isDirty: true };
};

/**
 * A card the author has not filled in yet: only an editing placeholder. A blank
 * card the block already keyed is authored content and is never dropped.
 */
const isBlankCard = (card: Card) => (
  !card.card_key
  && !card.term.trim() && !card.definition.trim() && !card.term_image && !card.definition_image
);

/** The deck's cards without its first keyless blank placeholder, if any. */
const dropOnePlaceholder = (cards: Card[]): Card[] => {
  const index = cards.findIndex(isBlankCard);
  if (index < 0) { return cards; }
  return [...cards.slice(0, index), ...cards.slice(index + 1)];
};

/**
 * Moves a card to another deck, at the end. The card object itself moves, so
 * its id, `card_key` and images go with it. The target's blank placeholder is
 * dropped so the moved card is the one to edit.
 */
export const moveCard = (state: GameState, target: CardTarget, toDeckId: string): GameState => {
  const at = locate(state, target);
  const fromDeck = at && state.decks[at.deck];
  const toDeck = state.decks.find((deck) => deck.id === toDeckId);
  if (!at || !fromDeck || !toDeck || fromDeck.id === toDeck.id) { return state; }
  const card = fromDeck.cards[at.card];
  return {
    ...withDecks(
      state,
      state.decks.map((deck) => {
        if (deck.id === fromDeck.id) { return { ...deck, cards: deck.cards.filter((_, index) => index !== at.card) }; }
        if (deck.id === toDeck.id) {
          return { ...deck, cards: [...dropOnePlaceholder(deck.cards), card] };
        }
        return deck;
      }),
    ),
    isDirty: true,
  };
};

/** One card from a `get_settings` card object, with editor defaults filled in. */
const cardFromSettings = (card: Partial<Card>): Card => ({
  ...emptyCard(),
  card_key: card.card_key,
  term: card.term || '',
  // Image URLs are kept as the block returns them (relative to its Studio);
  // the view resolves them for display. See imageDisplayUrl.
  term_image: card.term_image || '',
  term_image_path: card.term_image_path || '',
  term_image_alt: card.term_image_alt || '',
  definition: card.definition || '',
  definition_image: card.definition_image || '',
  definition_image_path: card.definition_image_path || '',
  definition_image_alt: card.definition_image_alt || '',
});

/** A loaded deck's cards, with a blank placeholder when the deck is empty. */
const editableCards = (cards: unknown): Card[] => {
  const loaded = (Array.isArray(cards) ? cards : []).map(cardFromSettings);
  return loaded.length ? loaded : [emptyCard()];
};

const deckFromSettings = (deck: SettingsDeck | null | undefined, index: number): Deck => {
  const name = typeof deck?.name === 'string' ? deck.name.trim() : '';
  return {
    id: uuidv4(),
    deck_key: typeof deck?.deck_key === 'string' ? deck.deck_key : undefined,
    // A deck without a usable name is renamed for display only; saving the
    // block stores whatever the author then confirms.
    name: name || `Deck ${index + 1}`,
    cards: editableCards(deck?.cards),
  };
};

/**
 * The decks a `get_settings` response describes. A backend that predates
 * decks (or a fresh block) sends no `decks`, so its `cards` is one deck.
 */
export const decksFromSettings = (data: SettingsResponse): Deck[] => {
  const stored = Array.isArray(data.decks) ? data.decks : [];
  if (stored.length) { return stored.map(deckFromSettings); }
  return [
    {
      id: uuidv4(),
      name: DEFAULT_DECK_NAME,
      cards: editableCards(data.cards),
    },
  ];
};

/** The freshly fetched settings replace whatever was there, clean and loaded. */
export const loaded = (value: GameState): GameState => ({
  ...withDecks(value, value.decks, value.activeDeckId),
  isDirty: false,
  isLoaded: true,
  error: null,
});

/** The state one `get_settings` response describes, seeded and loaded. */
export const stateFromSettings = (data: SettingsResponse): GameState => {
  const decks = decksFromSettings(data);
  return loaded({
    ...initialState,
    type: data.game_type || 'flashcards',
    settings: {
      shuffle: data.is_shuffled !== undefined ? data.is_shuffled : true,
      timer: data.has_timer !== undefined ? data.has_timer : true,
    },
    decks,
    activeDeckId: decks[0].id,
    list: decks[0].cards,
    // Only a backend that sent a decks array can be saved with one.
    supportsDecks: Array.isArray(data.decks),
  });
};

export const setError = (state: GameState, error: Error): GameState => ({ ...state, error });

export const setLoadError = (state: GameState, error: Error): GameState => ({ ...state, error, loadFailed: true });

export const clearError = (state: GameState): GameState => ({ ...state, error: null, loadFailed: false });

export const setDirty = (state: GameState): GameState => ({ ...state, isDirty: true });
