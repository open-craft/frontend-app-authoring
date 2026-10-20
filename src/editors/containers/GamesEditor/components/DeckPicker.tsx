import React from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Button, Dropdown, Icon } from '@openedx/paragon';
import { Check, KeyboardArrowDown } from '@openedx/paragon/icons';

import messages from '@src/editors/containers/GamesEditor/messages';

/** What the picker needs to know about a deck; it never sees the cards. */
export interface DeckSummary {
  id: string;
  name: string;
}

interface DeckPickerProps {
  /** The authored decks, in stored order. */
  decks: DeckSummary[];
  activeDeckId: string;
  onSelectDeck: (deckId: string) => void;
  onAddDeck: () => void;
}

/**
 * Compact deck selector: the active deck on a dropdown listing every deck (the
 * active one marked) with a New deck action. Renders nothing without a deck, so
 * a caller can pass whatever it has without guarding.
 */
const DeckPicker = ({
  decks,
  activeDeckId,
  onSelectDeck,
  onAddDeck,
}: DeckPickerProps) => {
  const intl = useIntl();
  const toggleId = React.useId();
  const activeDeck = decks.find((deck) => deck.id === activeDeckId);

  if (!activeDeck) { return null; }

  return (
    <div className="deck-picker d-flex align-items-center align-self-stretch">
      <span className="deck-picker-label mr-2 text-gray-600">
        {intl.formatMessage(messages.deckPickerLabel)}
      </span>
      <Dropdown>
        <Dropdown.Toggle
          id={toggleId}
          variant="tertiary"
          size="md"
          className="deck-picker-toggle d-flex align-items-center"
          aria-label={intl.formatMessage(messages.deckPickerToggleLabel, { deckName: activeDeck.name })}
        >
          <span className="deck-picker-active-name">{activeDeck.name}</span>
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {decks.map((deck) => (
            <Dropdown.Item
              key={deck.id}
              className="deck-picker-option d-flex align-items-center"
              onClick={() => onSelectDeck(deck.id)}
              // The check icon is decorative; this is what a screen reader hears.
              aria-current={deck.id === activeDeckId ? 'true' : undefined}
            >
              <span className="flex-grow-1">{deck.name}</span>
              {deck.id === activeDeckId && <Icon src={Check} className="ml-2 text-success" />}
            </Dropdown.Item>
          ))}
          <Dropdown.Divider />
          <Dropdown.Item className="deck-picker-option" onClick={onAddDeck}>
            {intl.formatMessage(messages.newDeckLabel)}
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
};

export default DeckPicker;
