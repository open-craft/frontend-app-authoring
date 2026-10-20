import userEvent from '@testing-library/user-event';
import { initializeMocks, render, screen } from '@src/testUtils';

import DeckPicker from './DeckPicker';

const decks = [
  { id: 'deck-1', name: 'Deck 1' },
  { id: 'deck-2', name: 'Deck 2' },
];

const toggleName = 'Deck 1, change deck';

const renderPicker = (overrides: {
  decks?: { id: string; name: string; }[];
  activeDeckId?: string;
  onSelectDeck?: jest.Mock;
  onAddDeck?: jest.Mock;
} = {}) => {
  const props = {
    decks,
    activeDeckId: 'deck-1',
    onSelectDeck: jest.fn(),
    onAddDeck: jest.fn(),
    ...overrides,
  };
  render(<DeckPicker {...props} />);
  return props;
};

describe('DeckPicker', () => {
  beforeEach(() => {
    initializeMocks();
  });

  // The visible text is the deck name; the label carries what the control is
  // for, and still contains that visible text.
  it('names the selector after the label and the active deck', () => {
    renderPicker();
    expect(screen.getByRole('button', { name: toggleName })).toBeInTheDocument();
    expect(screen.queryByText('Deck 2')).not.toBeInTheDocument();
  });

  it('lists every deck, marking only the active one', async () => {
    const user = userEvent.setup();
    renderPicker();
    await user.click(screen.getByRole('button', { name: toggleName }));

    expect(screen.getByRole('button', { name: 'Deck 1' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: 'Deck 2' })).not.toHaveAttribute('aria-current');
  });

  it('selects a deck', async () => {
    const user = userEvent.setup();
    const { onSelectDeck } = renderPicker();
    await user.click(screen.getByRole('button', { name: toggleName }));
    await user.click(screen.getByRole('button', { name: 'Deck 2' }));
    expect(onSelectDeck).toHaveBeenCalledWith('deck-2');
  });

  it('adds a deck', async () => {
    const user = userEvent.setup();
    const { onAddDeck } = renderPicker();
    await user.click(screen.getByRole('button', { name: toggleName }));
    await user.click(screen.getByRole('button', { name: 'New deck' }));
    expect(onAddDeck).toHaveBeenCalledTimes(1);
  });

  // A keyboard-only author must be able to reach the decks too.
  it('opens the deck list from the keyboard', async () => {
    const user = userEvent.setup();
    renderPicker();
    screen.getByRole('button', { name: toggleName }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Deck 2' })).toBeInTheDocument();
  });

  it('renders nothing without a deck to show', () => {
    renderPicker({ decks: [] });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
