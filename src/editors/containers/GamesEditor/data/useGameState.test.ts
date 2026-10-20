import { QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { initializeMocks, makeQueryClientWrapper } from '@src/testUtils';

import * as api from './api';
import { emptyCard, useGameState } from './useGameState';

// Only the transport is mocked: buildSavePayload stays real, so the tests see
// the payload the block would actually receive.
jest.mock('./api', () => ({
  ...jest.requireActual('./api'),
  getSettings: jest.fn(),
  saveSettings: jest.fn(),
  uploadImage: jest.fn(),
}));

const mockedApi = api as unknown as Record<'getSettings' | 'saveSettings', jest.Mock>;
const block = {
  blockId: 'block-v1:org+course+run+type@games+block@abc',
  studioEndpointUrl: 'http://studio',
  isLibrary: false,
};

describe('emptyCard', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Card ids key image uploads and validation errors to a card, so two cards
  // must never share one, however close together they are created.
  it('gives two cards created in the same instant different ids', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(emptyCard().id).not.toEqual(emptyCard().id);
  });
});

// `useGameState` uses React Query, so rendering it bare needs a client. A new
// one per call, like a fresh page load, with no retries (as testUtils does).
// A null block means no fetch, so the hook starts from its initial state.
const renderGameState = () =>
  renderHook(() => useGameState(null), {
    wrapper: makeQueryClientWrapper(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
  });

describe('useGameState', () => {
  beforeEach(() => {
    initializeMocks();
  });

  // The save path reads the state straight after awaiting an upload, before
  // React has re-rendered. There is one copy of the state and it is current.
  it('exposes the latest state synchronously after an action', () => {
    const { result } = renderGameState();
    const { actions } = result.current;
    const before = actions.getLatestState().list.length;
    act(() => {
      actions.addCard();
      // Still inside act: React has not re-rendered yet.
      expect(actions.getLatestState().list).toHaveLength(before + 1);
    });
  });

  // One store, not a rendered copy plus a synchronous mirror: after a change
  // the rendered state and the synchronous read are the same object.
  it('renders the same state object it exposes synchronously', () => {
    const { result } = renderGameState();
    act(() => {
      result.current.actions.addCard();
    });
    expect(result.current.state).toBe(result.current.actions.getLatestState());
  });
});

describe('saving with decks', () => {
  const wrapper = makeQueryClientWrapper(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  const loadBlock = (payload: Record<string, unknown>) => {
    mockedApi.getSettings.mockResolvedValue({ data: payload });
    return renderHook(() => useGameState(block), { wrapper });
  };

  const saveArgs = () => mockedApi.saveSettings.mock.calls[0][1];

  beforeEach(() => {
    initializeMocks();
    mockedApi.saveSettings.mockReset();
    mockedApi.saveSettings.mockResolvedValue({ data: { success: true } });
  });

  // The save runs after awaits, from the store, so a caller holding older cards
  // or decks cannot overwrite what the editor shows.
  it('saves the state, not the cards and decks the caller passes in', async () => {
    const { result } = loadBlock({
      game_type: 'flashcards',
      cards: [{ term: 'fresh', definition: 'd', card_key: 'k1' }],
      decks: [
        { deck_key: 'd1', name: 'Deck 1', cards: [{ term: 'fresh', definition: 'd', card_key: 'k1' }] },
        { deck_key: 'd2', name: 'Deck 2', cards: [] },
      ],
    });
    await waitFor(() => expect(result.current.state.isLoaded).toBe(true));

    await act(async () => {
      await result.current.actions.save({
        gameType: 'flashcards',
        isShuffled: true,
        hasTimer: true,
        cards: [{ term: 'stale', definition: 'stale' }],
        decks: [{ name: 'Stale', cards: [{ term: 'stale', definition: 'stale' }] }],
        title: 'Title',
      });
    });

    const payload = api.buildSavePayload(saveArgs());
    expect(payload.cards.map((card) => card.term)).toEqual(['fresh']);
    expect(payload.decks?.map((deck) => deck.name)).toEqual(['Deck 1', 'Deck 2']);
  });

  // A block that never sent decks does not declare the field; sending one would
  // be rejected outright.
  it('sends a cards-only save to a backend without decks', async () => {
    const { result } = loadBlock({
      game_type: 'flashcards',
      cards: [{ term: 'fresh', definition: 'd', card_key: 'k1' }],
    });
    await waitFor(() => expect(result.current.state.isLoaded).toBe(true));

    await act(async () => {
      await result.current.actions.save({
        gameType: 'flashcards',
        isShuffled: true,
        hasTimer: true,
        cards: [{ term: 'stale', definition: 'stale' }],
        decks: [{ name: 'Stale', cards: [{ term: 'stale', definition: 'stale' }] }],
        title: null,
      });
    });

    expect(saveArgs()).not.toHaveProperty('decks');
    const payload = api.buildSavePayload(saveArgs());
    expect(payload).not.toHaveProperty('decks');
    expect(payload.cards.map((card) => card.term)).toEqual(['fresh']);
    expect(payload).not.toHaveProperty('display_name');
  });
});
