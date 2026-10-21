import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert,
  Button as PgnButton,
  Icon,
  OverlayTrigger,
  Spinner,
  Tooltip,
} from '@openedx/paragon';
import { Info, InfoOutline, Plus } from '@openedx/paragon/icons';

import EditorContainer from '@src/editors/containers/EditorContainer';
import Button from '@src/editors/sharedComponents/Button';
import DraggableList from '@src/generic/DraggableList';
import { isBlankCard } from '@src/editors/containers/GamesEditor/data/gameTransitions';
import type { GameActions } from '@src/editors/containers/GamesEditor/data/useGameState';
import type { SaveOutcome } from '@src/editors/containers/GamesEditor/data/saveGame';
import type { EditorSaveOverrideResult } from '@src/editors/hooks';
import {
  cardIdOf,
  fieldKey,
  getContent,
  imageDisplayUrl,
  type TextField,
  validateCards,
  type ValidationErrors,
} from '@src/editors/containers/GamesEditor/gameContent';
import messages from '@src/editors/containers/GamesEditor/messages';
import type {
  BlockEditorProps,
  Card,
  Deck,
  GameSettings,
  GameType,
  ImageData,
  ImageType,
  RequestError,
} from '@src/editors/containers/GamesEditor/types';
import DeckOutline from './DeckOutline';
import { DeckCardDragProvider, DeckCardList } from './DeckCardDragContext';
import GameCard from './GameCard';
import CardPreview from './CardPreview';
import GameImageSettingsModal from './GameImageSettingsModal';
import SettingsSidebar from './SettingsSidebar';

/** Which image the settings modal is editing. */
type ImageSettingsTarget = { imageData: ImageData; cardId: string; imageType: ImageType; };

// The card and setting actions come straight from useGameState, so reuse its
// contract. `getLatestState`, `waitForPendingRequests` and `save` are consumed
// by the block wrapper (GamesEditorForBlock), not by the view.
type ViewActions = Omit<
  GameActions,
  'getLatestState' | 'waitForPendingRequests' | 'save' | 'reload' | 'clearError'
>;

export interface GameEditorProps extends ViewActions {
  onClose: (() => void) | null;
  /** The save seam. Its outcome is mapped to the container's contract below. */
  onSave: () => Promise<SaveOutcome>;
  returnFunction?: BlockEditorProps['returnFunction'];
  blockFinished: boolean;
  /** The block's Studio, which its relative image URLs are shown from. */
  studioEndpointUrl: string;
  settings: GameSettings;
  type: GameType;
  /** The active deck's cards, for the single-list (Matching) view. */
  list: Card[];
  /** Every deck, in stored order; the first is the block's primary deck. */
  decks: Deck[];
  activeDeckId: string;
  /** True when the block stores decks and the game type can author them. */
  supportsDecks: boolean;
  isDirty: () => boolean;
  error: RequestError | null;
  loadFailed: boolean;
  reload: () => void;
  clearError: () => void;
}

/**
 * The Games editor itself: the deck outline (or the flat card list for a game
 * that has one), the settings sidebar and the alerts, inside the shared
 * EditorContainer. Holds only view state (validation messages, the open image
 * settings, whether a save is out); the game content comes in through props.
 */
const GameEditor = ({
  onClose,
  onSave,
  returnFunction = null,
  blockFinished,
  studioEndpointUrl,

  settings,
  setShuffleStatus,
  setTimerStatus,
  type,
  updateType,

  list,
  decks,
  activeDeckId,
  supportsDecks,
  updateTerm,
  updateDefinition,
  updateTermImageAlt,
  updateDefinitionImageAlt,
  toggleOpen,
  setList,
  addCard,
  removeCard,
  selectDeck,
  addDeck,
  renameDeck,
  deleteDeck,
  moveCard,

  uploadGameImage,
  deleteGameImage,

  isDirty,
  error,
  loadFailed,
  reload,
  clearError,
}: GameEditorProps) => {
  const intl = useIntl();
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isAlertVisible, setIsAlertVisible] = useState(true);
  // Set when a Save click found deck names that block it, so the failure stays
  // visible even after the author dismisses the alert.
  const [deckAlertVisible, setDeckAlertVisible] = useState(false);
  // Bumped on every save/validate that found bad deck names: the outline opens
  // those rows and focuses the first one. Live typing never does.
  const [deckFocusRequest, setDeckFocusRequest] = useState(0);
  // True from the Save click until the save has settled. The form is disabled
  // meanwhile: the response closes the editor, so anything typed during the
  // wait would be lost without a word.
  const [isSaving, setIsSaving] = useState(false);
  // Which image the settings modal is editing; null while it is closed.
  const [imageSettings, setImageSettings] = useState<ImageSettingsTarget | null>(null);
  const closeImageSettings = useCallback(() => setImageSettings(null), []);

  // Writes one text field of a card straight into the game state and clears
  // that field's validation error, so the message goes away as the author types.
  // The card is named by id: several deck bodies render at once.
  const handleInputChange = useCallback((cardId: string, field: TextField, value: string) => {
    if (field === 'term') {
      updateTerm({ cardId, term: value });
    } else {
      updateDefinition({ cardId, definition: value });
    }
    const key = fieldKey(cardId, field);
    setValidationErrors((prev) => {
      if (!prev[key]) { return prev; }
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, [updateTerm, updateDefinition]);

  // Deck authoring exists only where the block stores decks and the game type
  // authors them: matching renders one deck and offers no rename or move.
  const deckAuthoring = supportsDecks && type === 'flashcards';

  // One place decides what a save would carry, so the count beside each deck
  // name is the count that will be saved (blank placeholders excluded).
  const contents = useMemo(() => getContent({ type, settings, decks, list }), [type, settings, decks, list]);
  const deckSummaries = useMemo(() =>
    decks.map((deck, index) => ({
      id: deck.id,
      name: deck.name,
      cardCount: contents.decks[index].cards.length,
    })), [decks, contents]);
  // Deck names are checked from the decks on screen, so a duplicate or an
  // empty name is flagged while the author types. This is also what a save
  // blocks on: validateCards is the one implementation of the rule.
  const deckNameErrors = useMemo(
    () => validateCards({ decks, list, type, supportsDecks }).deckErrors,
    [decks, list, type, supportsDecks],
  );
  const hasDeckNameErrors = Object.keys(deckNameErrors).length > 0;
  // Show alert when new validation errors appear
  useEffect(() => {
    if (Object.keys(validationErrors).length > 0) {
      setIsAlertVisible(true);
    }
  }, [validationErrors]);

  const cardsWithErrors = useMemo(() => new Set(Object.keys(validationErrors).map(cardIdOf)), [validationErrors]);

  // The decks holding a card with an error: their rows must open, or the message
  // stays behind a collapsed row. The card itself is opened below.
  const cardErrorDeckIds = useMemo(
    () =>
      decks
        .filter((deck) => deck.cards.some((card) => cardsWithErrors.has(card.id)))
        .map((deck) => deck.id),
    [decks, cardsWithErrors],
  );

  // Opens every card that has an error, in whichever deck it lives, so the
  // author can see the message.
  useEffect(() => {
    decks.forEach((deck) =>
      deck.cards.forEach((card) => {
        if (cardsWithErrors.has(card.id) && !card.editorOpen) {
          toggleOpen({ cardId: card.id, isOpen: true });
        }
      })
    );
  }, [cardsWithErrors, decks, toggleOpen]);

  // The seam reports its outcome: an invalid save shows the same inline errors
  // a click used to raise, and an alert when deck names are the cause.
  const handleSave = useCallback((): Promise<EditorSaveOverrideResult> => {
    setIsSaving(true);
    return onSave()
      .then((outcome): EditorSaveOverrideResult => {
        if (outcome.status === 'invalid') {
          setValidationErrors(outcome.validationErrors);
          if (Object.keys(outcome.deckErrors).length > 0) {
            setDeckAlertVisible(true);
            setDeckFocusRequest((request) => request + 1);
          }
        }
        // The container owns the leave-page warning, so it has to know whether
        // anything was written.
        if (outcome.status === 'saved') { return { persisted: true }; }
        return { persisted: false, error: outcome.status === 'failed' ? outcome.error : undefined };
      })
      .finally(() => setIsSaving(false));
  }, [onSave]);

  // Reorders one deck's cards; the deck is named, so it need not be active.
  const reorderDeck = useCallback((deckId: string, cards: Card[], from: number, to: number) => {
    if (to < 0 || to >= cards.length) { return; }
    const next = cards.slice();
    [next[from], next[to]] = [next[to], next[from]];
    setList({ deckId, cards: next });
  }, [setList]);

  // DraggableList keeps its own mirror through `setState` and reports the final
  // order through `updateOrder`. Here both are the same store, so the mirror
  // setter is the persist and `updateOrder` has nothing left to do.
  const replaceDeckCards = useCallback((
    deckId: string,
    cards: Card[],
    next: React.SetStateAction<Card[]>,
  ) => {
    setList({ deckId, cards: typeof next === 'function' ? next(cards) : next });
  }, [setList]);

  // A drag reports one move; the transition is the only thing that writes it.
  const handleCardMove = useCallback((move: { cardId: string; toDeckId: string; toIndex: number; }) => {
    moveCard(move);
  }, [moveCard]);

  const openImageSettings = useCallback((card: Card, imageType: ImageType) => {
    setImageSettings({
      imageData: {
        url: imageDisplayUrl(card[`${imageType}_image`], studioEndpointUrl),
        altText: card[`${imageType}_image_alt`] || '',
      },
      cardId: card.id,
      imageType,
    });
  }, [studioEndpointUrl]);

  const handleImageSettingsSave = useCallback(({ altText }: { altText: string; }) => {
    // A modal that was already open when Save was clicked must not write
    // into a save that has already gone out.
    if (isSaving || !imageSettings) { return; }
    const { cardId, imageType } = imageSettings;
    if (imageType === 'term') {
      updateTermImageAlt({ cardId, termImageAlt: altText });
    } else {
      updateDefinitionImageAlt({ cardId, definitionImageAlt: altText });
    }
    closeImageSettings();
  }, [imageSettings, updateTermImageAlt, updateDefinitionImageAlt, isSaving, closeImageSettings]);

  const loadError = (
    <Alert
      variant="danger"
      icon={Info}
      actions={[
        <PgnButton key="retry" variant="outline-primary" onClick={reload}>
          {intl.formatMessage(messages.retryButton)}
        </PgnButton>,
      ]}
    >
      <Alert.Heading>
        {intl.formatMessage(messages.loadErrorHeading)}
      </Alert.Heading>
      {error?.message && <p className="mb-0">{error.message}</p>}
    </Alert>
  );

  const loading = loadFailed ? loadError : (
    <div className="text-center p-6">
      <Spinner
        animation="border"
        className="m-3"
        screenReaderText={intl.formatMessage(messages.loadingSpinner)}
      />
    </div>
  );

  // One card row. Every action names the card and its deck, so several decks
  // can render their cards at the same time.
  const renderCard = (deckId: string, cards: Card[], card: Card, index: number) => (
    <GameCard
      key={card.id}
      card={card}
      index={index}
      draggable={!isBlankCard(card)}
      type={type}
      studioEndpointUrl={studioEndpointUrl}
      errors={{
        term: validationErrors[fieldKey(card.id, 'term')],
        definition: validationErrors[fieldKey(card.id, 'definition')],
      }}
      isSaving={isSaving}
      onToggle={(isOpen) => toggleOpen({ cardId: card.id, isOpen })}
      onChange={(field, value) => handleInputChange(card.id, field, value)}
      onMoveUp={() => reorderDeck(deckId, cards, index, index - 1)}
      onMoveDown={() => reorderDeck(deckId, cards, index, index + 1)}
      onDelete={() => removeCard({ cardId: card.id })}
      // Fire and forget: the hook tracks the request and reports its failure.
      onImagePicked={(imageType, file) => {
        void uploadGameImage({ cardId: card.id, imageFile: file, imageType });
      }}
      onImageRemoved={(imageType) => deleteGameImage({ cardId: card.id, imageType })}
      onOpenImageSettings={(imageType) => openImageSettings(card, imageType)}
    />
  );

  const addCardButton = (deckId?: string) => {
    const deck = deckId == null ? null : decks.find((candidate) => candidate.id === deckId);
    return (
      <Button
        className="add-button text-primary-500 py-3 pr-3 pl-0"
        onClick={() => addCard(deckId)}
        iconBefore={Plus}
        variant="link"
        size="inline"
        // Several decks may be open at once, so each names the deck it adds to.
        // The single-list view keeps the plain label.
        aria-label={deck ? intl.formatMessage(messages.addCardToDeckLabel, { deckName: deck.name }) : undefined}
      >
        {intl.formatMessage(messages.addLabel)}
      </Button>
    );
  };

  // The cards of one deck, as its outline row shows them. The drag layer
  // supplies the preview decks, so a card moved here by a drag-over appears.
  const renderDeck = (deckId: string) => (
    <div className="d-flex flex-column">
      <DeckCardList
        deckId={deckId}
        renderCard={(deck, card, index) => renderCard(deck.id, deck.cards, card, index)}
      />
      {addCardButton(deckId)}
    </div>
  );

  const page = (
    <div className="page-body d-flex align-items-start w-100 py-2">
      <div className="terms d-flex flex-column align-items-start align-self-stretch">
        <div className="description d-flex flex-row align-items-start align-self-stretch mb-2">
          <div className="description-header text-primary-500 font-weight-bold">
            {intl.formatMessage(
              type === 'matching' ? messages.descriptionHeaderMatching : messages.descriptionHeaderFlashcard,
            )}
          </div>
          <OverlayTrigger
            placement="bottom"
            overlay={
              <Tooltip id="description-tooltip">
                {intl.formatMessage(type === 'matching' ? messages.descriptionMatching : messages.descriptionFlashcard)}
              </Tooltip>
            }
          >
            <Icon src={InfoOutline} />
          </OverlayTrigger>
        </div>
        {deckAuthoring ?
          (
            <DeckCardDragProvider
              decks={decks}
              onCardMove={handleCardMove}
              renderOverlayCard={(card) => (
                <div className="deck-drag-overlay d-flex align-items-center px-4 py-3 border border-light-700 rounded bg-white shadow-sm">
                  <CardPreview card={card} type={type} studioEndpointUrl={studioEndpointUrl} />
                </div>
              )}
            >
              <DeckOutline
                decks={deckSummaries}
                activeDeckId={activeDeckId}
                nameErrors={deckNameErrors}
                cardErrorDeckIds={cardErrorDeckIds}
                focusRequest={deckFocusRequest}
                onSelect={selectDeck}
                onRename={(deckId, name) => renameDeck({ deckId, name })}
                onDelete={(deckId) => deleteDeck({ deckId })}
                onAdd={() => addDeck()}
                renderDeck={renderDeck}
              />
            </DeckCardDragProvider>
          ) :
          (
            <>
              <DraggableList
                itemList={list}
                setState={(next) => replaceDeckCards(activeDeckId, list, next)}
                updateOrder={() => () => undefined}
              >
                {list.map((card, index) => renderCard(activeDeckId, list, card, index))}
              </DraggableList>
              {addCardButton()}
            </>
          )}
      </div>
      <SettingsSidebar
        type={type}
        settings={settings}
        updateType={updateType}
        setShuffleStatus={setShuffleStatus}
        setTimerStatus={setTimerStatus}
      />
    </div>
  );

  return (
    <EditorContainer
      getContent={() => contents}
      onClose={onClose}
      // For the container's cancel and discard flows; the save path honours
      // it itself.
      returnFunction={returnFunction}
      // Saves through the block's own handler. Without this the shared
      // saveBlock thunk takes over, and its payload builder drops the
      // *_image_path storage keys, losing the link from a card to its file.
      onSave={handleSave}
      isDirty={isDirty}
    >
      <div className="xblock-games-editor">
        <div className="h-75 overflow-auto">
          {deckAlertVisible && hasDeckNameErrors && (
            <Alert
              variant="danger"
              className="mt-2"
              icon={Info}
              dismissible
              onClose={() => setDeckAlertVisible(false)}
            >
              <Alert.Heading>
                {intl.formatMessage(messages.deckNameErrorHeading)}
              </Alert.Heading>
              <p>{intl.formatMessage(messages.deckNameErrorAlert)}</p>
            </Alert>
          )}
          {Object.keys(validationErrors).length > 0 && isAlertVisible && (
            <Alert
              variant="danger"
              className="mt-2"
              icon={Info}
              dismissible
              onClose={() => setIsAlertVisible(false)}
            >
              <Alert.Heading>
                {intl.formatMessage(messages.validationErrorHeading)}
              </Alert.Heading>
              <p>{intl.formatMessage(messages.validationErrorAlert)}</p>
            </Alert>
          )}
          {error && !loadFailed && (
            <Alert
              variant="danger"
              className="mt-2"
              icon={Info}
              dismissible
              onClose={clearError}
            >
              <Alert.Heading>
                {intl.formatMessage(
                  error.code === 'saveFailed' ? messages.saveErrorHeading : messages.requestErrorHeading,
                )}
              </Alert.Heading>
              {error.message && <p className="mb-0">{error.message}</p>}
            </Alert>
          )}
          {!blockFinished ? loading : (
            // A disabled fieldset disables every control inside it.
            <fieldset disabled={isSaving} className="game-editor-form">
              {page}
            </fieldset>
          )}
        </div>
      </div>
      {imageSettings && (
        <GameImageSettingsModal
          key={`${imageSettings.cardId}-${imageSettings.imageType}-${imageSettings.imageData.url}`}
          imageData={imageSettings.imageData}
          close={closeImageSettings}
          onSave={handleImageSettingsSave}
          isSaveDisabled={isSaving}
        />
      )}
    </EditorContainer>
  );
};

export default GameEditor;
