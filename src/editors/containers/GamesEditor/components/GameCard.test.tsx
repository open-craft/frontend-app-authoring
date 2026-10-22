import React from 'react';
import userEvent from '@testing-library/user-event';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { initializeMocks, render, screen, waitFor } from '@src/testUtils';

import { emptyCard } from '../data/gameTransitions';
import type { Card } from '../types';
import GameCard from './GameCard';

const card = (over: Partial<Card> = {}): Card => ({
  ...emptyCard(),
  id: 'c1',
  term: 'One',
  definition: 'first',
  card_key: 'key-c1',
  editorOpen: false,
  ...over,
});

/** GameCard drags through dnd-kit, so it needs the context the editor gives it. */
const renderCard = (props: Partial<React.ComponentProps<typeof GameCard>> = {}) => {
  const handlers = {
    onToggle: jest.fn(),
    onChange: jest.fn(),
    onMoveUp: jest.fn(),
    onMoveDown: jest.fn(),
    onDelete: jest.fn(),
    onImagePicked: jest.fn(),
    onImageRemoved: jest.fn(),
    onOpenImageSettings: jest.fn(),
  };
  const { container } = render(
    <DndContext>
      <SortableContext items={['c1']}>
        <GameCard
          card={card()}
          index={0}
          type="flashcards"
          studioEndpointUrl="http://studio.example"
          errors={{}}
          isSaving={false}
          canMoveUp={false}
          canMoveDown={false}
          {...handlers}
          {...props}
        />
      </SortableContext>
    </DndContext>,
  );
  // The dropdown toggle carries aria-expanded too, so the heading is named by
  // the class its own tests and styles use.
  const heading = container.querySelector('.card-heading-wrapper') as HTMLElement;
  return { ...handlers, heading };
};

describe('GameCard', () => {
  beforeEach(() => {
    initializeMocks();
  });

  // Escape closes the menu and leaves focus on its toggle, never on the body.
  // The dropdown's own keydown handler marks the Escape handled (preventDefault
  // and stopPropagation, react-overlays Dropdown), which is also what keeps the
  // editor modal's document listener out of it.
  it('closes the menu on Escape, keeping focus on its toggle', async () => {
    const user = userEvent.setup();
    renderCard();
    const toggle = screen.getByRole('button', { name: 'Card actions' });

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');

    await waitFor(() => expect(toggle).toHaveAttribute('aria-expanded', 'false'));
    expect(toggle).toHaveFocus();
  });

  // The heading is a role="button" div, out of the disabled fieldset's reach,
  // so a save in flight has to lock it here.
  it('locks the heading trigger while a save is in flight', async () => {
    const user = userEvent.setup();
    const { onToggle, heading } = renderCard({ isSaving: true });

    expect(heading).toHaveAttribute('aria-disabled', 'true');

    await user.click(heading);
    expect(onToggle).not.toHaveBeenCalled();

    heading.focus();
    await user.keyboard('{Enter}');
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('leaves the heading trigger working when no save is in flight', async () => {
    const user = userEvent.setup();
    const { onToggle, heading } = renderCard();

    // aria-disabled is a string attribute: it reads "false", not absent.
    expect(heading).toHaveAttribute('aria-disabled', 'false');

    await user.click(heading);
    expect(onToggle).toHaveBeenCalledWith(true);
  });
});
