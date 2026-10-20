import React from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Button,
  Form,
  Icon,
  IconButton,
} from '@openedx/paragon';
import { DeleteOutline } from '@openedx/paragon/icons';

import BaseModal from '@src/editors/sharedComponents/BaseModal';
import type { DeckNameError } from '@src/editors/containers/GamesEditor/types';
import messages from '@src/editors/containers/GamesEditor/messages';

/** A deck as the settings panel shows it: its name and how many cards it holds. */
export interface DeckSettingSummary {
  id: string;
  name: string;
  cardCount: number;
}

interface DeckSettingsProps {
  /** The authored decks, in stored order. */
  decks: DeckSettingSummary[];
  activeDeckId: string;
  /** Deck ids whose name is invalid, with the reason. */
  nameErrors: Record<string, DeckNameError | undefined>;
  onSelect: (deckId: string) => void;
  /** Called on every keystroke, with what the author typed. */
  onRename: (deckId: string, name: string) => void;
  onDelete: (deckId: string) => void;
}

/**
 * Settings panel content for decks: pick the active deck, rename any deck, and
 * delete one. Deleting a deck with cards asks first; the last deck cannot be
 * deleted, because the block always stores at least one.
 */
const DeckSettings = ({
  decks,
  activeDeckId,
  nameErrors,
  onSelect,
  onRename,
  onDelete,
}: DeckSettingsProps) => {
  const intl = useIntl();
  // Local: only this panel cares which deletion is waiting for confirmation.
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);
  const pendingDelete = decks.find((deck) => deck.id === pendingDeleteId);
  const listRef = React.useRef<HTMLDivElement>(null);
  // The deck whose deletion we are waiting for, when it was the active one:
  // focus follows the neighbour that replaces it.
  const removedActiveDeckRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const removedDeckId = removedActiveDeckRef.current;
    if (!removedDeckId || decks.some((deck) => deck.id === removedDeckId)) { return; }
    removedActiveDeckRef.current = null;
    listRef.current?.querySelector<HTMLInputElement>('#deck-select-' + activeDeckId)?.focus();
  }, [decks, activeDeckId]);

  const deleteDeck = (deckId: string) => {
    if (deckId === activeDeckId) { removedActiveDeckRef.current = deckId; }
    onDelete(deckId);
  };

  const requestDelete = (deck: DeckSettingSummary) => {
    if (deck.cardCount > 0) {
      setPendingDeleteId(deck.id);
    } else {
      deleteDeck(deck.id);
    }
  };

  const confirmDelete = () => {
    if (pendingDelete) { deleteDeck(pendingDelete.id); }
    setPendingDeleteId(null);
  };

  return (
    <>
      <div ref={listRef}>
        <Form.RadioSet
          name="games-active-deck"
          value={activeDeckId}
          onChange={(event) => onSelect(event.target.value)}
          className="deck-list d-flex flex-column align-items-stretch"
          aria-label={intl.formatMessage(messages.deckListLabel)}
        >
          {decks.map((deck, index) => {
            const nameInputId = 'deck-name-' + deck.id;
            const errorId = 'deck-name-error-' + deck.id;
            const error = nameErrors[deck.id];
            return (
              <div key={deck.id} className="deck-row d-flex align-items-start mb-2">
                <Form.Radio
                  id={'deck-select-' + deck.id}
                  value={deck.id}
                  className="deck-row-select"
                >
                  <span className="sr-only">
                    {intl.formatMessage(messages.selectDeckLabel, { deckName: deck.name })}
                  </span>
                </Form.Radio>
                <div className="deck-row-body d-flex flex-column align-items-stretch flex-grow-1">
                  <label className="sr-only" htmlFor={nameInputId}>
                    {intl.formatMessage(messages.deckNameInputLabel, { number: index + 1 })}
                  </label>
                  <Form.Control
                    id={nameInputId}
                    type="text"
                    value={deck.name}
                    onChange={(event) => onRename(deck.id, event.target.value)}
                    isInvalid={!!error}
                    // The message is the field's description, not just nearby text.
                    aria-invalid={!!error}
                    aria-describedby={error ? errorId : undefined}
                  />
                  {error && (
                    <Form.Control.Feedback type="invalid" hasIcon={false}>
                      <span id={errorId}>
                        {intl.formatMessage(
                          error === 'duplicate' ? messages.deckNameDuplicate : messages.deckNameRequired,
                        )}
                      </span>
                    </Form.Control.Feedback>
                  )}
                  <small className="text-muted">
                    {intl.formatMessage(messages.deckCardCount, { cardCount: deck.cardCount })}
                  </small>
                </div>
                <IconButton
                  src={DeleteOutline}
                  iconAs={Icon}
                  alt={intl.formatMessage(messages.deleteDeckLabel, { deckName: deck.name })}
                  variant="primary"
                  className="deck-row-delete ml-2"
                  // The block always stores at least one deck.
                  disabled={decks.length === 1}
                  onClick={() => requestDelete(deck)}
                />
              </div>
            );
          })}
        </Form.RadioSet>
      </div>
      {pendingDelete && (
        <BaseModal
          isOpen
          close={() => setPendingDeleteId(null)}
          title={intl.formatMessage(messages.deleteDeckConfirmTitle)}
          size="sm"
          className="deck-delete-modal"
          confirmAction={
            <Button variant="danger" onClick={confirmDelete}>
              {intl.formatMessage(messages.deleteDeckConfirmButton)}
            </Button>
          }
        >
          <p>
            {intl.formatMessage(messages.deleteDeckConfirmBody, {
              deckName: pendingDelete.name,
              cardCount: pendingDelete.cardCount,
            })}
          </p>
        </BaseModal>
      )}
    </>
  );
};

export default DeckSettings;
