import userEvent from '@testing-library/user-event';
import { getConfig } from '@edx/frontend-platform';
import { initializeMocks, screen, waitFor } from '@src/testUtils';
import { editorRender } from '@src/editors/editorTestRender';
import type { PartialEditorState } from '@src/editors/data/redux';

import GamesEditor from '.';

// The editor through the real EditorContainer and the real API layer, with
// only HTTP mocked, the way a course author meets it inside the editor modal.
const blockId = 'block-v1:org+course+run+type@games+block@abc';
const handlerUrl = (name: string) => `${getConfig().STUDIO_BASE_URL}/xblock/${blockId}/handler/${name}`;

const appState = (): NonNullable<PartialEditorState['app']> => ({
  blockId,
  blockType: 'games',
  blockTitle: 'Games',
  learningContextId: 'course-v1:org+course+run',
  studioEndpointUrl: getConfig().STUDIO_BASE_URL,
  lmsEndpointUrl: getConfig().LMS_BASE_URL,
  blockValue: {
    data: {
      id: blockId,
      display_name: 'Games',
      category: 'games',
      data: '',
      metadata: { display_name: 'Games' },
    },
  },
  unitUrl: {
    data: { ancestors: [{ id: 'unit-1', display_name: 'Unit', category: 'vertical', has_children: true }] },
  },
});

const renderEditor = (onClose = jest.fn()) => {
  editorRender(<GamesEditor onClose={onClose} />, { initialState: { app: appState() } });
  return onClose;
};

const saveButton = () => screen.getByRole('button', { name: 'Save changes and return to learning context' });
const savePosts = (axiosMock: ReturnType<typeof initializeMocks>['axiosMock']) =>
  axiosMock.history.post.filter((request) => request.url === handlerUrl('save_settings'));

describe('GamesEditor in the editor modal', () => {
  let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];

  beforeEach(() => {
    ({ axiosMock } = initializeMocks());
    axiosMock.onPost(handlerUrl('get_settings')).reply(200, {
      game_type: 'matching',
      is_shuffled: true,
      has_timer: false,
      cards: [{ term: 'Photosynthesis', definition: 'How plants eat', card_key: 'k1' }],
    });
    axiosMock.onPost(handlerUrl('save_settings')).reply(200, { success: true });
  });

  it('saves an edit with the Save button, through the block handler, and closes', async () => {
    const user = userEvent.setup();
    const onClose = renderEditor();
    const term = await screen.findByDisplayValue('Photosynthesis');
    await user.type(term, ' now');
    await user.click(saveButton());

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    const [request] = savePosts(axiosMock);
    expect(JSON.parse(request.data)).toMatchObject({
      display_name: 'Games',
      game_type: 'matching',
      is_shuffled: true,
      has_timer: false,
      cards: [{ term: 'Photosynthesis now', definition: 'How plants eat', card_key: 'k1', order: 1 }],
    });
  });

  it('asks before discarding unsaved changes, and discards without saving', async () => {
    const user = userEvent.setup();
    const onClose = renderEditor();
    await user.type(await screen.findByDisplayValue('Photosynthesis'), '!');
    await user.click(screen.getByRole('button', { name: 'Discard changes and return to learning context' }));

    expect(await screen.findByText('Exit the editor?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Discard Changes and Exit' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(savePosts(axiosMock)).toHaveLength(0);
  });

  it('keeps the editor open, and sends nothing, while a card is incomplete', async () => {
    const user = userEvent.setup();
    const onClose = renderEditor();
    await user.clear(await screen.findByDisplayValue('How plants eat'));
    await user.click(saveButton());

    expect(await screen.findByText('We couldn\'t save your changes.')).toBeInTheDocument();
    expect(screen.getByText('Enter a definition')).toBeInTheDocument();
    expect(savePosts(axiosMock)).toHaveLength(0);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('GamesEditor decks', () => {
  let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];

  const deckSettings = {
    game_type: 'flashcards',
    is_shuffled: true,
    has_timer: false,
    cards: [{ term: 'One', definition: 'first', card_key: 'c1' }],
    decks: [
      { deck_key: 'dk-1', name: 'Deck 1', cards: [{ term: 'One', definition: 'first', card_key: 'c1' }] },
      { deck_key: 'dk-2', name: 'Deck 2', cards: [{ term: 'Two', definition: 'second', card_key: 'c2' }] },
    ],
  };

  beforeEach(() => {
    ({ axiosMock } = initializeMocks());
    axiosMock.onPost(handlerUrl('get_settings')).reply(200, deckSettings);
    axiosMock.onPost(handlerUrl('save_settings')).reply(200, { success: true });
  });

  const savedPayload = () => JSON.parse(savePosts(axiosMock)[0].data);

  it('lists the decks and switches the cards when another deck is selected', async () => {
    const user = userEvent.setup();
    renderEditor();
    expect(await screen.findByDisplayValue('One')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Deck 1, change deck' }));
    await user.click(await screen.findByText('Deck 2'));

    expect(await screen.findByDisplayValue('Two')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('One')).not.toBeInTheDocument();
  });

  it('adds a deck, renames it, and saves every deck with cards mirroring the first', async () => {
    const user = userEvent.setup();
    const onClose = renderEditor();
    await screen.findByDisplayValue('One');

    // The deck settings panel starts collapsed, like the other settings cards.
    await user.click(screen.getByText('Decks'));
    await user.click(screen.getByRole('button', { name: 'Deck 1, change deck' }));
    await user.click(await screen.findByText('New deck'));
    const nameInput = await screen.findByDisplayValue('Deck 3');
    await user.clear(nameInput);
    await user.type(nameInput, 'Extras');

    await user.click(saveButton());

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    const payload = savedPayload();
    expect(payload.decks.map((deck: { name: string; }) => deck.name)).toEqual(['Deck 1', 'Deck 2', 'Extras']);
    expect(payload.decks.map((deck: { deck_key?: string; }) => deck.deck_key)).toEqual(['dk-1', 'dk-2', undefined]);
    // The block's legacy cards field is the primary deck, not the active one.
    expect(payload.cards).toEqual(payload.decks[0].cards);
    expect(payload.cards).toEqual([expect.objectContaining({ term: 'One', card_key: 'c1' })]);
  });

  it('moves a card to another deck from the card menu', async () => {
    const user = userEvent.setup();
    const onClose = renderEditor();
    await screen.findByDisplayValue('One');

    await user.click(screen.getByRole('button', { name: 'Card actions' }));
    await user.click(await screen.findByText('Move to Deck 2'));

    expect(screen.queryByDisplayValue('One')).not.toBeInTheDocument();

    await user.click(saveButton());

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    const payload = savedPayload();
    expect(payload.decks[0].cards).toEqual([]);
    // The moved card keeps its block key and joins the other deck's cards.
    expect(payload.decks[1].cards).toEqual([
      expect.objectContaining({ term: 'Two', card_key: 'c2' }),
      expect.objectContaining({ term: 'One', card_key: 'c1' }),
    ]);
  });

  it('blocks the save and shows the error when two decks share a name', async () => {
    const user = userEvent.setup();
    const onClose = renderEditor();
    await screen.findByDisplayValue('One');

    await user.click(screen.getByText('Decks'));
    const secondName = screen.getByDisplayValue('Deck 2');
    await user.clear(secondName);
    await user.type(secondName, 'deck 1');

    await user.click(saveButton());

    // Both sides of the clash are flagged, each beside its own name field.
    expect(await screen.findAllByText('Deck names must be unique')).toHaveLength(2);
    expect(savePosts(axiosMock)).toHaveLength(0);
    expect(onClose).not.toHaveBeenCalled();
  });

  // A save blocked by deck names must say so outside the collapsed panel, even
  // when Matching has hidden the deck UI. The panel returns so the name can be
  // repaired, and no request goes out until it is.
  it('blocks a Matching save on deck names, explains it, and saves once repaired', async () => {
    const user = userEvent.setup();
    const onClose = renderEditor();
    await screen.findByDisplayValue('One');

    // Two decks share a name after editing in Flashcards.
    await user.click(screen.getByText('Decks'));
    const secondName = screen.getByDisplayValue('Deck 2');
    await user.clear(secondName);
    await user.type(secondName, 'deck 1');
    expect(await screen.findAllByText('Deck names must be unique')).toHaveLength(2);

    await user.click(screen.getByText('Type'));
    await user.click(screen.getByRole('button', { name: 'Matching' }));

    // Matching offers no deck picker, but the panel stays while a name needs
    // fixing, so the author is not left with feedback they cannot act on.
    expect(screen.queryByRole('button', { name: /change deck/ })).not.toBeInTheDocument();
    expect(screen.getByText('Decks')).toBeInTheDocument();

    await user.click(saveButton());

    // The failure is visible without opening anything, and nothing was sent.
    expect(await screen.findByText('Deck names need fixing')).toBeInTheDocument();
    expect(screen.getByText(/Review the deck names in Settings/)).toBeInTheDocument();
    expect(savePosts(axiosMock)).toHaveLength(0);
    expect(onClose).not.toHaveBeenCalled();

    // The open panel still holds the name to repair.
    const duplicate = await screen.findByDisplayValue('deck 1');
    await user.clear(duplicate);
    await user.type(duplicate, 'Deck 2');
    await waitFor(() => expect(screen.queryByText('Deck names need fixing')).not.toBeInTheDocument());

    await user.click(saveButton());
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(savedPayload().game_type).toEqual('matching');
  });

  // The same failure in Flashcards, with the deck panel collapsed: the alert
  // must appear on its own rather than the Save button doing nothing.
  it('explains blocked deck names when the deck panel is collapsed', async () => {
    const user = userEvent.setup();
    const onClose = renderEditor();
    await screen.findByDisplayValue('One');

    await user.click(screen.getByText('Decks'));
    const secondName = screen.getByDisplayValue('Deck 2');
    await user.clear(secondName);
    await user.type(secondName, 'deck 1');
    await user.click(screen.getByText('Decks'));
    expect(screen.queryByDisplayValue('deck 1')).not.toBeInTheDocument();

    await user.click(saveButton());

    expect(await screen.findByText('Deck names need fixing')).toBeInTheDocument();
    expect(savePosts(axiosMock)).toHaveLength(0);
    expect(onClose).not.toHaveBeenCalled();
  });

  // The panel flags a bad name as it is typed, before the author tries to save.
  it('flags an empty and a duplicate name while the author types', async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue('One');
    await user.click(screen.getByText('Decks'));

    const secondName = screen.getByDisplayValue('Deck 2');
    await user.clear(secondName);
    expect(await screen.findByText('Enter a deck name')).toBeInTheDocument();

    await user.type(secondName, 'deck 1');
    // Both decks are flagged: the clash is not the second deck's fault alone.
    expect(await screen.findAllByText('Deck names must be unique')).toHaveLength(2);
  });

  it('deletes the active deck after confirmation and edits the neighbour', async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue('One');

    await user.click(screen.getByText('Decks'));
    await user.click(screen.getByRole('radio', { name: 'Make Deck 2 the active deck' }));
    expect(await screen.findByDisplayValue('Two')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete Deck 2' }));
    expect(await screen.findByText('Delete deck?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete deck' }));

    expect(await screen.findByDisplayValue('One')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Deck 2')).not.toBeInTheDocument();
    // The last deck cannot be deleted.
    expect(screen.getByRole('button', { name: 'Delete Deck 1' })).toBeDisabled();
  });
});

describe('GamesEditor deck authoring availability', () => {
  let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];

  const card = { term: 'One', definition: 'first', card_key: 'c1' };

  beforeEach(() => {
    ({ axiosMock } = initializeMocks());
    axiosMock.onPost(handlerUrl('save_settings')).reply(200, { success: true });
  });

  const mockSettings = (body: unknown) => axiosMock.onPost(handlerUrl('get_settings')).reply(200, body);

  // A backend that predates decks answers with cards only; offering deck
  // authoring there would let an author create decks the block cannot keep.
  it('hides deck authoring when the block returns only cards', async () => {
    mockSettings({ game_type: 'flashcards', is_shuffled: true, has_timer: false, cards: [card] });
    renderEditor();

    expect(await screen.findByDisplayValue('One')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /change deck/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Decks')).not.toBeInTheDocument();

    // With a single deck there is nowhere to move a card to.
    await userEvent.setup().click(screen.getByRole('button', { name: 'Card actions' }));
    expect(screen.queryByText(/^Move to /)).not.toBeInTheDocument();
  });

  it('offers deck authoring when the block returns decks', async () => {
    mockSettings({
      game_type: 'flashcards',
      is_shuffled: true,
      has_timer: false,
      cards: [card],
      decks: [{ deck_key: 'dk-1', name: 'Deck 1', cards: [card] }],
    });
    renderEditor();

    expect(await screen.findByRole('button', { name: 'Deck 1, change deck' })).toBeInTheDocument();
    expect(screen.getByText('Decks')).toBeInTheDocument();
  });

  // Matching renders the block's primary deck only, so deck authoring would
  // offer edits the game type cannot use.
  it('hides deck authoring for a matching game', async () => {
    mockSettings({
      game_type: 'matching',
      is_shuffled: true,
      has_timer: true,
      cards: [card],
      decks: [{ deck_key: 'dk-1', name: 'Deck 1', cards: [card] }],
    });
    renderEditor();

    expect(await screen.findByDisplayValue('One')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /change deck/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Decks')).not.toBeInTheDocument();
  });
});
