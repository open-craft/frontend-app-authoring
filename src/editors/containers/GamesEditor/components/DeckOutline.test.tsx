import React from 'react';
import userEvent from '@testing-library/user-event';
import {
  initializeMocks,
  render,
  screen,
  waitFor,
} from '@src/testUtils';

import DeckOutline, { type DeckOutlineSummary } from './DeckOutline';

const decks: DeckOutlineSummary[] = [
  { id: 'deck-1', name: 'Deck 1', cardCount: 2 },
  { id: 'deck-2', name: 'Deck 2', cardCount: 0 },
  { id: 'deck-3', name: 'Ecology', cardCount: 1 },
];

const renderOutline = ({
  deckList = decks,
  activeDeckId = 'deck-1',
  nameErrors = {},
  cardErrorDeckIds = [],
  focusRequest = 0,
  onAdd = jest.fn(),
}: {
  deckList?: DeckOutlineSummary[];
  activeDeckId?: string;
  nameErrors?: Record<string, 'required' | 'duplicate' | undefined>;
  cardErrorDeckIds?: string[];
  focusRequest?: number;
  onAdd?: () => void;
} = {}) => {
  const onSelect = jest.fn();
  const onRename = jest.fn();
  const onDelete = jest.fn();
  render(
    <DeckOutline
      decks={deckList}
      activeDeckId={activeDeckId}
      nameErrors={nameErrors}
      cardErrorDeckIds={cardErrorDeckIds}
      focusRequest={focusRequest}
      onSelect={onSelect}
      onRename={onRename}
      onDelete={onDelete}
      onAdd={onAdd}
      renderDeck={(deckId) => <div>{`Cards of ${deckId}`}</div>}
    />,
  );
  return { onSelect, onRename, onDelete, onAdd };
};

const toggle = (name: string) => screen.getByRole('button', { name });

describe('DeckOutline', () => {
  beforeEach(() => {
    initializeMocks();
  });

  // Every deck starts collapsed, the active one included: the outline is a list
  // to scan. Rows are independent, not an accordion.
  it('starts with every deck collapsed and opens rows independently', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderOutline();

    expect(toggle('Expand Deck 1')).toHaveAttribute('aria-expanded', 'false');
    expect(toggle('Expand Deck 2')).toHaveAttribute('aria-expanded', 'false');
    expect(toggle('Expand Ecology')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Cards of deck-1')).not.toBeInTheDocument();

    await user.click(toggle('Expand Deck 2'));

    // The active deck stays collapsed; opening one row does not close another.
    expect(toggle('Expand Deck 1')).toHaveAttribute('aria-expanded', 'false');
    expect(toggle('Collapse Deck 2')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByText('Cards of deck-1')).not.toBeInTheDocument();
    expect(screen.getByText('Cards of deck-2')).toBeInTheDocument();
    expect(onSelect).toHaveBeenCalledWith('deck-2');

    await user.click(toggle('Expand Deck 1'));

    expect(toggle('Collapse Deck 1')).toHaveAttribute('aria-expanded', 'true');
    expect(toggle('Collapse Deck 2')).toHaveAttribute('aria-expanded', 'true');
  });

  it('opens a newly added deck and focuses its name', async () => {
    const user = userEvent.setup();
    const Harness = () => {
      const [deckList, setDeckList] = React.useState(decks);
      return (
        <DeckOutline
          decks={deckList}
          activeDeckId="deck-1"
          nameErrors={{}}
          onSelect={() => undefined}
          onRename={() => undefined}
          onDelete={() => undefined}
          onAdd={() =>
            setDeckList((current) => [
              ...current,
              { id: 'deck-4', name: 'Deck 4', cardCount: 0 },
            ])}
          renderDeck={(deckId) => <div>{`Cards of ${deckId}`}</div>}
        />
      );
    };
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Add deck' }));

    expect(toggle('Collapse Deck 4')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Cards of deck-4')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Deck 4 name')).toHaveFocus());
  });

  // A name error must never be hidden behind a collapsed row, but it must not
  // pull the caret out of the field the author is typing in either.
  it('opens the rows with invalid names and explains them without moving the caret', async () => {
    const user = userEvent.setup();
    renderOutline({ nameErrors: { 'deck-2': 'duplicate', 'deck-3': 'required' } });

    expect(toggle('Collapse Deck 2')).toHaveAttribute('aria-expanded', 'true');
    expect(toggle('Collapse Ecology')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Cards of deck-2')).toBeInTheDocument();
    expect(screen.getByText('Cards of deck-3')).toBeInTheDocument();

    expect(screen.getByLabelText('Deck 2 name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Deck 2 name')).toHaveAttribute(
      'aria-describedby',
      'deck-outline-name-error-deck-2',
    );
    expect(screen.getByText('Deck names must be unique')).toBeInTheDocument();
    expect(screen.getByText('Enter a deck name')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Deck 3 name'));
    expect(screen.getByLabelText('Deck 3 name')).toHaveFocus();
    expect(screen.getByLabelText('Deck 2 name')).not.toHaveFocus();
  });

  // A save that found bad names asks once, and only then is the caret moved.
  it('opens the invalid rows and focuses the first invalid name on request', () => {
    renderOutline({ nameErrors: { 'deck-2': 'duplicate', 'deck-3': 'required' }, focusRequest: 1 });

    expect(toggle('Collapse Deck 2')).toHaveAttribute('aria-expanded', 'true');
    expect(toggle('Collapse Ecology')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Deck 2 name')).toHaveFocus();
  });

  it('opens a deck that holds a card with an error', () => {
    renderOutline({ cardErrorDeckIds: ['deck-2'] });

    expect(toggle('Collapse Deck 2')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Cards of deck-2')).toBeInTheDocument();
  });

  // The block always stores at least one deck, so its delete is unavailable.
  it('cannot delete the last deck', () => {
    renderOutline({ deckList: [decks[0]] });
    expect(screen.getByRole('button', { name: 'Delete Deck 1' })).toBeDisabled();
  });

  it('deletes an empty deck without asking', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderOutline();

    await user.click(screen.getByRole('button', { name: 'Delete Deck 2' }));

    expect(onDelete).toHaveBeenCalledWith('deck-2');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // A deck with cards takes its cards with it, so it asks first.
  it('asks before deleting a deck that has cards, and deletes it on confirm', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderOutline();

    await user.click(screen.getByRole('button', { name: 'Delete Deck 1' }));

    expect(screen.getByRole('dialog', { name: 'Delete deck?' })).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Delete deck' }));

    expect(onDelete).toHaveBeenCalledWith('deck-1');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // Deleting the deck the author was working in must leave them somewhere:
  // the deck that takes over opens and takes the focus.
  it('opens and focuses the replacement deck after deleting the active one', async () => {
    const user = userEvent.setup();
    const Harness = () => {
      const [deckList, setDeckList] = React.useState([
        { id: 'deck-1', name: 'Deck 1', cardCount: 2 },
        { id: 'deck-2', name: 'Deck 2', cardCount: 2 },
      ]);
      const [active, setActive] = React.useState('deck-2');
      return (
        <DeckOutline
          decks={deckList}
          activeDeckId={active}
          nameErrors={{}}
          onSelect={setActive}
          onRename={() => undefined}
          onDelete={(deckId) => {
            setDeckList((current) => current.filter((deck) => deck.id !== deckId));
            if (deckId === active) { setActive('deck-1'); }
          }}
          onAdd={() => undefined}
          renderDeck={(deckId) => <div>{`Cards of ${deckId}`}</div>}
        />
      );
    };
    render(<Harness />);

    // Both rows start collapsed; deleting the active deck opens its replacement.
    expect(toggle('Expand Deck 1')).toHaveAttribute('aria-expanded', 'false');
    await user.click(screen.getByRole('button', { name: 'Delete Deck 2' }));
    await user.click(screen.getByRole('button', { name: 'Delete deck' }));

    expect(toggle('Collapse Deck 1')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Cards of deck-1')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Deck 1 name')).toHaveFocus());
  });

  // The toggle is a role="button" div, so it has to answer Space as well as
  // Enter, and name the body it controls — but only while that body exists,
  // because a collapsed row unmounts it.
  it('toggles a row with Space and Enter, pointing at the body only while it exists', async () => {
    const user = userEvent.setup();
    renderOutline();

    const trigger = toggle('Expand Deck 2');
    // Collapsed: the body is not in the DOM, so the trigger must not name it.
    expect(trigger).not.toHaveAttribute('aria-controls');

    trigger.focus();
    await user.keyboard(' ');
    const expanded = toggle('Collapse Deck 2');
    expect(expanded).toHaveAttribute('aria-expanded', 'true');
    expect(expanded).toHaveAttribute('aria-controls', 'deck-outline-body-deck-2');
    expect(screen.getByText('Cards of deck-2')).toBeInTheDocument();
    expect(document.getElementById('deck-outline-body-deck-2')).toBeInTheDocument();

    await user.keyboard('{Enter}');
    const collapsed = toggle('Expand Deck 2');
    expect(collapsed).toHaveAttribute('aria-expanded', 'false');
    expect(collapsed).not.toHaveAttribute('aria-controls');
  });
});
