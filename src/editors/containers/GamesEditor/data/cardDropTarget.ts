import { isBlankCard } from './gameTransitions';
import type { CardDropTarget, Deck } from '@src/editors/containers/GamesEditor/types';

/**
 * What a drag is hovering. Typed rather than encoded in a dnd id, so the
 * resolver never parses strings and a deck target can never be mistaken for a
 * card target.
 */
export type CardDropOver =
  | { kind: 'card'; deckId: string; cardId: string; }
  | { kind: 'deck'; deckId: string; };

/**
 * Where dropping `activeCardId` on `over` lands, or null when it would not move
 * it: no target, an unknown card or deck, a card that is only the editor's blank
 * placeholder, or the position it is already in.
 *
 * A non-null result is passed directly to `moveCard`, which is the only thing
 * that acts on it: its index is a position in the target deck counted after the
 * card has left its source deck but before that deck's blank placeholder is
 * dropped, the same frame `moveCard` takes.
 *
 * The geometry is dnd-kit's: while dragging, the sorting strategy draws the gap
 * below the row being passed on a downward move and above it on an upward one,
 * so a hovered row means "insert after it" going down and "insert before it"
 * going up. That gap is converted once into the post-removal frame, because a
 * card moving down its own deck has already vacated the position it is counted
 * from. A hovered deck header appends.
 *
 * Pure and independent of dnd-kit, so it is tested without any layout. It
 * depends on the state transitions for the blank-card rule, never the other way
 * round.
 */
export const resolveCardDrop = (
  decks: Deck[],
  activeCardId: string,
  over: CardDropOver | null | undefined,
): CardDropTarget | null => {
  if (!over) { return null; }
  const fromDeckIndex = decks.findIndex((deck) => deck.cards.some((card) => card.id === activeCardId));
  const toDeckIndex = decks.findIndex((deck) => deck.id === over.deckId);
  if (fromDeckIndex < 0 || toDeckIndex < 0) { return null; }
  const sameDeck = fromDeckIndex === toDeckIndex;
  const fromIndex = decks[fromDeckIndex].cards.findIndex((card) => card.id === activeCardId);
  // A blank card is editor scaffolding: there is nothing to drag.
  if (isBlankCard(decks[fromDeckIndex].cards[fromIndex])) { return null; }
  const targetCards = decks[toDeckIndex].cards;

  // A hovered deck header appends: past the end of the deck as it is drawn.
  if (over.kind === 'deck') {
    // An empty deck is drawn as its one blank placeholder, which a card entering
    // it replaces, so there is nothing to sit behind: it lands at 0.
    const empty = targetCards.length === 1 && isBlankCard(targetCards[0]);
    const index = empty ? 0 : sameDeck ? targetCards.length - 1 : targetCards.length;
    // A card in another deck at that position is not the same position.
    return sameDeck && index === fromIndex ? null : { deckId: over.deckId, index };
  }

  const hoveredIndex = targetCards.findIndex((card) => card.id === over.cardId);
  if (hoveredIndex < 0) { return null; }
  const downward = toDeckIndex > fromDeckIndex || (sameDeck && hoveredIndex > fromIndex);
  const gap = downward ? hoveredIndex + 1 : hoveredIndex;
  const index = sameDeck && gap > fromIndex ? gap - 1 : gap;
  // Cross-deck always has somewhere to land; only the same position is a no-op.
  return sameDeck && index === fromIndex ? null : { deckId: over.deckId, index };
};
