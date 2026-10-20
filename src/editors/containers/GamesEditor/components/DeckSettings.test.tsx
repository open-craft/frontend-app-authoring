import React from 'react';
import userEvent from '@testing-library/user-event';
import { fireEvent, initializeMocks, render, screen } from '@src/testUtils';

import DeckSettings from './DeckSettings';

const decks = [
  { id: 'deck-1', name: 'Deck 1', cardCount: 2 },
  { id: 'deck-2', name: 'Deck 2', cardCount: 0 },
];

const renderSettings = ({
  deckList = decks,
  nameErrors = {},
}: { deckList?: typeof decks; nameErrors?: Record<string, 'required' | 'duplicate' | undefined>; } = {}) => {
  const onSelect = jest.fn();
  const onRename = jest.fn();
  const onDelete = jest.fn();
  render(
    <DeckSettings
      decks={deckList}
      activeDeckId="deck-1"
      nameErrors={nameErrors}
      onSelect={onSelect}
      onRename={onRename}
      onDelete={onDelete}
    />,
  );
  return { onSelect, onRename, onDelete };
};

describe('DeckSettings', () => {
  beforeEach(() => {
    initializeMocks();
  });

  it('shows each deck with its name, card count and selection state', () => {
    renderSettings();
    expect(screen.getByLabelText('Deck 1 name')).toHaveValue('Deck 1');
    expect(screen.getByLabelText('Deck 2 name')).toHaveValue('Deck 2');
    expect(screen.getByText('2 cards')).toBeInTheDocument();
    expect(screen.getByText('No cards')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Make Deck 1 the active deck' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Make Deck 2 the active deck' })).not.toBeChecked();
  });

  it('selects the deck whose radio the author picks', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderSettings();
    await user.click(screen.getByRole('radio', { name: 'Make Deck 2 the active deck' }));
    expect(onSelect).toHaveBeenCalledWith('deck-2');
  });

  it('hands every keystroke to onRename, keyed by deck id', () => {
    const { onRename } = renderSettings();
    fireEvent.change(screen.getByLabelText('Deck 2 name'), { target: { value: 'Renamed' } });
    expect(onRename).toHaveBeenCalledWith('deck-2', 'Renamed');
  });

  it('names the deck group', () => {
    renderSettings();
    expect(screen.getByRole('radiogroup', { name: 'Decks' })).toBeInTheDocument();
  });

  // The reason is the field's description, so a screen reader reads it with the
  // name rather than as loose text beside it.
  it('marks an invalid name and says why', () => {
    renderSettings({
      nameErrors: { 'deck-1': 'required', 'deck-2': 'duplicate' },
    });
    const firstName = screen.getByLabelText('Deck 1 name');
    expect(firstName).toHaveClass('is-invalid');
    expect(firstName).toHaveAttribute('aria-invalid', 'true');
    expect(firstName).toHaveAttribute('aria-describedby', 'deck-name-error-deck-1');
    expect(screen.getByText('Enter a deck name')).toHaveAttribute('id', 'deck-name-error-deck-1');
    expect(screen.getByText('Deck names must be unique')).toBeInTheDocument();
  });

  it('leaves a valid name undescribed', () => {
    renderSettings();
    expect(screen.getByLabelText('Deck 2 name')).not.toHaveAttribute('aria-describedby');
    expect(screen.getByLabelText('Deck 2 name')).toHaveAttribute('aria-invalid', 'false');
  });

  it('deletes an empty deck without asking', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderSettings();
    await user.click(screen.getByRole('button', { name: 'Delete Deck 2' }));
    expect(onDelete).toHaveBeenCalledWith('deck-2');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // A deck with cards takes its cards with it, so it asks first.
  it('asks before deleting a deck that has cards', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderSettings();
    await user.click(screen.getByRole('button', { name: 'Delete Deck 1' }));

    const dialog = screen.getByRole('dialog', { name: 'Delete deck?' });
    expect(dialog).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Delete deck' }));
    expect(onDelete).toHaveBeenCalledWith('deck-1');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the deck when the author cancels', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderSettings();
    await user.click(screen.getByRole('button', { name: 'Delete Deck 1' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // Deleting the deck the author was editing must not drop keyboard focus on the
  // page: it moves to the deck that takes over.
  it('moves focus to the new active deck after deleting the active one', async () => {
    const Harness = () => {
      const [deckList, setDeckList] = React.useState(decks);
      const [active, setActive] = React.useState('deck-1');
      return (
        <DeckSettings
          decks={deckList}
          activeDeckId={active}
          nameErrors={{}}
          onSelect={setActive}
          onRename={() => undefined}
          onDelete={(deckId) => {
            setDeckList((current) => current.filter((deck) => deck.id !== deckId));
            if (deckId === active) { setActive('deck-2'); }
          }}
        />
      );
    };
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Delete Deck 1' }));
    await user.click(screen.getByRole('button', { name: 'Delete deck' }));

    expect(await screen.findByRole('radio', { name: 'Make Deck 2 the active deck' })).toHaveFocus();
  });

  // The block always stores at least one deck, so its delete is unavailable.
  it('cannot delete the last deck', () => {
    renderSettings({ deckList: [decks[0]] });
    expect(screen.getByRole('button', { name: 'Delete Deck 1' })).toBeDisabled();
  });
});
