import React from 'react';
import { createPortal } from 'react-dom';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type ScreenReaderInstructions,
} from '@dnd-kit/core';
import { isKeyboardEvent } from '@dnd-kit/utilities';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

import messages from '@src/editors/containers/GamesEditor/messages';
import { resolveCardDrop, type CardDropOver } from '@src/editors/containers/GamesEditor/data/cardDropTarget';
import { initialState, isBlankCard, moveCard } from '@src/editors/containers/GamesEditor/data/gameTransitions';
import type {
  Card,
  CardDropTarget,
  Deck,
} from '@src/editors/containers/GamesEditor/types';

/**
 * Drag authoring for the deck outline, pointer and keyboard alike: every
 * dnd-kit call in the editor lives here, and callers render chrome only.
 *
 * The committed decks never change during a drag. A local, immutable
 * `previewDecks` tree is what the outline renders, and the one commit goes
 * through the editor's `moveCard` transition on drop. A cancelled drag simply
 * drops the preview, so the committed view returns with nothing written.
 */

/** One committed move. The only thing this module reports. */
export interface CardMove {
  cardId: string;
  toDeckId: string;
  /** Insertion index in the target deck, in `moveCard`'s post-removal frame. */
  toIndex: number;
}

const DECK_ID_PREFIX = 'deck:';
const EMPTY_ZONE_SUFFIX = ':empty';

/** Namespaced so a deck droppable id can never be a card id. */
const deckDroppableId = (deckId: string) => DECK_ID_PREFIX + deckId;
const emptyZoneDroppableId = (deckId: string) => DECK_ID_PREFIX + deckId + EMPTY_ZONE_SUFFIX;

/**
 * The dragged card's own deck is not a destination while dragging: its header
 * and, once a preview has emptied it, its empty zone both mean "still here".
 * One helper so the drag, the drop and the announcement cannot disagree.
 */
const isSourceDeckTarget = (overId: string, sourceDeckId: string | null | undefined) =>
  sourceDeckId != null
  && (overId === deckDroppableId(sourceDeckId) || overId === emptyZoneDroppableId(sourceDeckId));

/** Typed targets: the resolver never parses a droppable id. */
const targetsOf = (decks: Deck[]): Map<string, CardDropOver> => {
  const targets = new Map<string, CardDropOver>();
  decks.forEach((deck) => {
    deck.cards.forEach((card) => {
      targets.set(card.id, { kind: 'card', deckId: deck.id, cardId: card.id });
    });
    targets.set(deckDroppableId(deck.id), { kind: 'deck', deckId: deck.id });
    targets.set(emptyZoneDroppableId(deck.id), { kind: 'deck', deckId: deck.id });
  });
  return targets;
};

const findCard = (decks: Deck[], cardId: string): Card | null => {
  for (const deck of decks) {
    const card = deck.cards.find((candidate) => candidate.id === cardId);
    if (card) { return card; }
  }
  return null;
};

/** A human description of one drop target, for the screen-reader announcements. */
type DropLabel =
  | { kind: 'position'; position: number; deckName: string; }
  | { kind: 'end'; deckName: string; }
  | { kind: 'empty'; deckName: string; };

/**
 * Names a droppable by what an author sees. Positions come from the preview
 * tree, which is what is on screen while dragging; deck names come from the
 * committed decks. Ids are never part of the result.
 */
const labelTarget = (overId: string, decks: Deck[], preview: Deck[]): DropLabel | null => {
  for (const deck of decks) {
    const previewDeck = preview.find((candidate) => candidate.id === deck.id);
    const cards = previewDeck?.cards ?? deck.cards;
    if (overId === deckDroppableId(deck.id)) {
      return cards.every(isBlankCard)
        ? { kind: 'empty', deckName: deck.name }
        : { kind: 'end', deckName: deck.name };
    }
    if (overId === emptyZoneDroppableId(deck.id)) {
      return { kind: 'empty', deckName: deck.name };
    }
    const position = cards.findIndex((card) => card.id === overId);
    if (position >= 0) {
      return { kind: 'position', position: position + 1, deckName: deck.name };
    }
  }
  return null;
};

/** What to call a card: its text, never its id. */
const cardLabelOf = (cardId: string, decks: Deck[], fallback: string): string => {
  const card = findCard(decks, cardId);
  return card?.term.trim() || fallback;
};

/** The deck a card is in, by name. */
const deckLabelOf = (cardId: string, decks: Deck[], fallback: string): string => {
  const deck = decks.find((entry) => entry.cards.some((card) => card.id === cardId));
  return deck?.name || fallback;
};

/**
 * What `moveCard` makes of a drop target: the decks after it, and where the
 * card lands among them. `moveCard` is pure and already owns the clamping and
 * blank-placeholder rules, so this reuses it on a throwaway state instead of
 * duplicating them; a no-op returns the same decks array, which is how callers
 * detect "nothing to render differently". `index` is the position to
 * announce: `target.index` is measured before the target deck's placeholder
 * is dropped, so it can be one past where the card actually ends up.
 */
const moveResult = (decks: Deck[], cardId: string, target: CardDropTarget) => {
  const state = {
    ...initialState,
    decks,
    activeDeckId: decks[0]?.id ?? '',
    list: decks[0]?.cards ?? [],
  };
  const moved = moveCard(state, cardId, target).decks;
  const deck = moved.find((candidate) => candidate.id === target.deckId);
  return { decks: moved, index: deck?.cards.findIndex((card) => card.id === cardId) ?? -1 };
};

interface DragPreview {
  /** The decks to render: the preview while dragging, the committed ones after. */
  previewDecks: Deck[];
  activeCardId: string | null;
  activeCard: Card | null;
}

const DeckDragContext = React.createContext<DragPreview>({
  previewDecks: [],
  activeCardId: null,
  activeCard: null,
});

/** The decks to render and the card being dragged, for rows inside the provider. */
export const useDeckDragPreview = () => React.useContext(DeckDragContext);

interface DeckCardDragProviderProps {
  /** Committed decks. Not mutated, and never written to during a drag. */
  decks: Deck[];
  /** Called once, on a valid drop. The caller applies `moveCard`. */
  onCardMove: (move: CardMove) => void;
  /** What follows the pointer: chrome only, never a sortable row. */
  renderOverlayCard: (card: Card) => React.ReactNode;
  children: React.ReactNode;
}

/**
 * The one dnd-kit context for the whole deck outline: every deck body is a
 * `SortableContext` inside it, and every deck header is a droppable.
 */
export const DeckCardDragProvider = ({
  decks,
  onCardMove,
  renderOverlayCard,
  children,
}: DeckCardDragProviderProps) => {
  const intl = useIntl();
  const [previewDecks, setPreviewDecks] = React.useState<Deck[] | null>(null);
  const [activeCardId, setActiveCardId] = React.useState<string | null>(null);
  // The latest preview, read by handlers: several drag-over events can arrive
  // before React commits the state, and each must build on the last.
  const previewRef = React.useRef<Deck[] | null>(null);
  // The latest committed decks, for the announcement callbacks. Reading the prop
  // directly would rebuild the announcements - and re-register the live-region
  // listener - on every keystroke in the editor.
  const decksRef = React.useRef(decks);
  React.useEffect(() => {
    decksRef.current = decks;
  }, [decks]);
  // The card being dragged, for the cancel handler, which runs after the state
  // is gone. The drop announcement is built before the preview is dropped,
  // because the live region reads it after this handler returns.
  const activeCardIdRef = React.useRef<string | null>(null);
  const dropAnnouncementRef = React.useRef<string | null>(null);
  // The last drop target that would really move the card, in committed-deck
  // coordinates. A cross-deck preview re-parents the active card, after which
  // dnd-kit can report the card as its own `over`; without this the drop would
  // silently no-op.
  const lastMoveRef = React.useRef<CardMove | null>(null);
  // The hovered target and the 1-based position it will put the card in. The
  // live region is read after this handler has run, by which time the preview
  // already holds the card, so the hovered row's own index is a position past
  // the gap: the announcement has to come from the drop, not from the row.
  const hoverRef = React.useRef<{ overId: string; position: number; } | null>(null);

  // Pointer events cover mouse, pen and touch; a small distance keeps a click
  // on the handle from starting a drag. A separate TouchSensor would compete
  // with this one for the same touch gesture.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // Arrows move to the next droppable in that direction - across deck
    // containers too, because there is one context for the whole outline.
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const reset = React.useCallback(() => {
    previewRef.current = null;
    lastMoveRef.current = null;
    hoverRef.current = null;
    activeCardIdRef.current = null;
    setPreviewDecks(null);
    setActiveCardId(null);
  }, []);

  // Focus follows the card after a commit or a cancel. The card is re-rendered
  // (possibly in another deck), so the old activator node is gone: look the new
  // row up by its data attribute and wait for React to have rendered it.
  const focusCardHandle = React.useCallback((cardId: string) => {
    const attempt = (remaining: number) => {
      const row = Array.from(document.querySelectorAll<HTMLElement>('[data-dnd-id]'))
        .find((element) => element.dataset.dndId === cardId);
      const handle = row?.querySelector<HTMLElement>('[data-drag-handle]');
      if (handle) {
        handle.focus();
        return;
      }
      if (remaining > 0) {
        requestAnimationFrame(() => attempt(remaining - 1));
        return;
      }
      // The handle is gone (a target that never opened, or a slower update):
      // keep keyboard users inside the outline instead of on `<body>`.
      document.querySelector<HTMLElement>('[data-deck-outline]')?.focus();
    };
    requestAnimationFrame(() => attempt(2));
  }, []);

  const handleDragStart = ({ active }: DragStartEvent) => {
    const cardId = String(active.id);
    if (!findCard(decks, cardId)) { return; }
    dropAnnouncementRef.current = null;
    activeCardIdRef.current = cardId;
    lastMoveRef.current = null;
    hoverRef.current = null;
    previewRef.current = decks;
    setPreviewDecks(decks);
    setActiveCardId(cardId);
  };

  const handleDragOver = ({ active, over, activatorEvent }: DragOverEvent) => {
    if (!over) { return; }
    const cardId = String(active.id);
    const overId = String(over.id);
    const sourceDeckId = decks.find((deck) => deck.cards.some((card) => card.id === cardId))?.id;
    // Keyboard arrows reach the header above the first row. For a keyboard drag
    // that is not a destination: moving the card to the end for an ArrowUp that
    // never left the deck would be a trap. A pointer drop there still appends,
    // which is the resolver's own header behaviour.
    if (isKeyboardEvent(activatorEvent) && isSourceDeckTarget(overId, sourceDeckId)) {
      // A cross-deck preview may still be on screen when the arrow comes back:
      // show the committed tree and drop the stale target, so the screen agrees
      // with the no-op the drop will be.
      if (previewRef.current && previewRef.current !== decks) {
        previewRef.current = decks;
        setPreviewDecks(decks);
      }
      lastMoveRef.current = null;
      hoverRef.current = null;
      return;
    }
    // The drop target is resolved against the committed decks, which is the
    // frame `moveCard` takes: a preview has already dropped the target deck's
    // blank placeholder, so its indexes are in a different frame.
    const committedTarget = targetsOf(decks).get(overId);
    const committedMove = committedTarget ? resolveCardDrop(decks, cardId, committedTarget) : null;
    if (committedMove) {
      lastMoveRef.current = { cardId, toDeckId: committedMove.deckId, toIndex: committedMove.index };
      hoverRef.current = { overId, position: moveResult(decks, cardId, committedMove).index + 1 };
    } else {
      hoverRef.current = null;
    }
    const preview = previewRef.current;
    if (!preview) { return; }
    const target = targetsOf(preview).get(overId);
    const move = target ? resolveCardDrop(preview, cardId, target) : null;
    if (!move) { return; }
    // Only a cross-deck move changes the preview: within one deck the card
    // stays in place and the sorting strategy draws the gap. Reordering the
    // preview there would double the displacement.
    const sourceDeck = preview.find((entry) => entry.cards.some((card) => card.id === cardId));
    if (sourceDeck?.id === move.deckId) { return; }
    const next = moveResult(preview, cardId, move).decks;
    if (next === preview) { return; }
    previewRef.current = next;
    setPreviewDecks(next);
  };

  const handleDragEnd = ({ active, over, activatorEvent }: DragEndEvent) => {
    const cardId = String(active.id);
    const overId = over ? String(over.id) : null;
    const keyboardDrag = isKeyboardEvent(activatorEvent);
    let move: CardMove | null = null;
    if (overId) {
      const sourceDeckId = decks.find((deck) => deck.cards.some((card) => card.id === cardId))?.id;
      if (keyboardDrag && isSourceDeckTarget(overId, sourceDeckId)) {
        // Keyboard dropped on its own header or empty zone: no move. A pointer
        // drop there is still the resolver's append.
        move = null;
      } else if (overId === cardId) {
        // dnd-kit can report the card itself as the target once a preview has
        // re-parented it. Only a preview in a different deck from the card's
        // committed source means a move happened; a same-deck drag that ends
        // over its own id has not moved, whatever row it last hovered.
        const committedDeck = decks.find((deck) => deck.cards.some((card) => card.id === cardId));
        const previewDeck = previewRef.current?.find((deck) => deck.cards.some((card) => card.id === cardId));
        move = committedDeck && previewDeck && previewDeck.id !== committedDeck.id
          ? lastMoveRef.current
          : null;
      } else {
        // A final non-active target wins, resolved against committed decks.
        const target = targetsOf(decks).get(overId);
        const resolved = target ? resolveCardDrop(decks, cardId, target) : null;
        if (resolved) { move = { cardId, toDeckId: resolved.deckId, toIndex: resolved.index }; }
      }
    }
    // The live region reads this after this handler returns, so name the drop
    // while the preview is still here.
    const landing = move ? moveResult(decks, cardId, { deckId: move.toDeckId, index: move.toIndex }).index : -1;
    dropAnnouncementRef.current = dropMessage(cardNameOf(cardId), move, landing, previewRef.current ?? decks);
    // A null/outside over cancels: nothing to commit.
    reset();
    if (move) { onCardMove(move); }
    // Only a keyboard drag had focus on the handle to begin with; a pointer or
    // touch drop must not move focus (or pop the handle's tooltip).
    if (keyboardDrag) { focusCardHandle(cardId); }
  };

  const handleDragCancel = ({ activatorEvent }: DragCancelEvent) => {
    const cardId = activeCardIdRef.current;
    reset();
    if (cardId && isKeyboardEvent(activatorEvent)) { focusCardHandle(cardId); }
  };

  // Every announcement uses visible names and positions, never ids: dnd-kit's
  // defaults announce raw usage keys, which mean nothing to an author.
  // These read the latest decks through a ref, so the announcements object
  // stays the same while the author types and the live-region listener is not
  // re-registered. A locale change still rebuilds them (the `intl` dep).
  const cardNameOf = React.useCallback(
    (cardId: string) => cardLabelOf(cardId, decksRef.current, intl.formatMessage(messages.dragUnknownCard)),
    [intl],
  );
  const deckNameOf = React.useCallback(
    (cardId: string) => deckLabelOf(cardId, decksRef.current, intl.formatMessage(messages.dragUnknownDeck)),
    [intl],
  );
  const overMessage = React.useCallback((cardId: string, overId: string | null) => {
    const cardName = cardNameOf(cardId);
    const decksNow = decksRef.current;
    const sourceDeckId = decksNow.find((deck) => deck.cards.some((card) => card.id === cardId))?.id;
    if (overId && isSourceDeckTarget(overId, sourceDeckId)) {
      // Not a destination: the card is still in this deck.
      return undefined;
    }
    const label = overId ? labelTarget(overId, decksNow, previewRef.current ?? decksNow) : null;
    if (!label) { return intl.formatMessage(messages.dragOverNothing, { cardName }); }
    if (label.kind === 'position') {
      const hovered = hoverRef.current;
      return intl.formatMessage(messages.dragOverPosition, {
        cardName,
        // Where the drop will put it; the row's own index is only a fallback.
        position: hovered?.overId === overId ? hovered.position : label.position,
        deckName: label.deckName,
      });
    }
    if (label.kind === 'end') {
      return intl.formatMessage(messages.dragOverEnd, { cardName, deckName: label.deckName });
    }
    return intl.formatMessage(messages.dragOverEmptyDeck, { cardName, deckName: label.deckName });
  }, [cardNameOf, intl]);

  const dropMessage = React.useCallback((
    cardName: string,
    move: CardMove | null,
    landing: number,
    preview: Deck[],
  ) => {
    if (!move) { return intl.formatMessage(messages.dragDroppedNowhere, { cardName }); }
    const deck = decksRef.current.find((entry) => entry.id === move.toDeckId);
    const deckName = deck?.name || intl.formatMessage(messages.dragUnknownDeck);
    if (!deck || deck.cards.every(isBlankCard)) {
      return intl.formatMessage(messages.dragDroppedInEmptyDeck, { cardName, deckName });
    }
    const cards = preview.find((entry) => entry.id === move.toDeckId)?.cards ?? deck.cards;
    // `landing` is where the card now sits, so the last real position is the end.
    if (landing + 1 >= cards.length) {
      return intl.formatMessage(messages.dragDroppedAtEnd, { cardName, deckName });
    }
    return intl.formatMessage(messages.dragDroppedAtPosition, {
      cardName,
      position: landing + 1,
      deckName,
    });
  }, [intl]);

  const announcements = React.useMemo<Announcements>(() => ({
    onDragStart: ({ active }) =>
      intl.formatMessage(messages.dragPickedUp, {
        cardName: cardNameOf(String(active.id)),
        deckName: deckNameOf(String(active.id)),
      }),
    // Hovering the dragged card itself is not a destination: say nothing and
    // leave the pick-up announcement in place.
    onDragOver: ({ active, over }) => (
      over && String(over.id) === String(active.id)
        ? undefined
        : overMessage(String(active.id), over ? String(over.id) : null)
    ),
    // Built in handleDragEnd, before the preview is dropped.
    onDragEnd: ({ active }) =>
      dropAnnouncementRef.current
        ?? intl.formatMessage(messages.dragDroppedNowhere, { cardName: cardNameOf(String(active.id)) }),
    onDragCancel: ({ active }) =>
      intl.formatMessage(messages.dragCancelled, {
        cardName: cardNameOf(String(active.id)),
        deckName: deckNameOf(String(active.id)),
      }),
  }), [cardNameOf, deckNameOf, intl, overMessage]);

  const screenReaderInstructions = React.useMemo<ScreenReaderInstructions>(() => ({
    draggable: intl.formatMessage(messages.dragScreenReaderInstructions),
  }), [intl]);

  const activeCard = activeCardId ? findCard(decks, activeCardId) : null;
  const value = React.useMemo<DragPreview>(
    () => ({ previewDecks: previewDecks ?? decks, activeCardId, activeCard }),
    [previewDecks, decks, activeCardId],
  );

  return (
    <DeckDragContext.Provider value={value}>
      <DndContext
        sensors={sensors}
        // The rows and headers are the only droppables, so stock corners works.
        collisionDetection={closestCorners}
        modifiers={[restrictToVerticalAxis]}
        // A collapsed deck expanded mid-drag must be measured for arrows and
        // for the pointer to reach its rows.
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        // Our own announcements name cards and decks; our own focus handling puts
        // the caret back on the moved card's handle, which dnd-kit cannot do
        // once the row has been re-rendered in another deck.
        accessibility={{ announcements, screenReaderInstructions, restoreFocus: false }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {children}
        {
          // Inside DndContext's React subtree so the overlay reads its context,
          // portalled out of the editor's scrolling box and above its modal
          // (Paragon uses --pgn-elevation-modal-zindex, 1050; dnd-kit's own
          // overlay defaults to 999 and would disappear behind it). The portal
          // also leaves the editor's wrapper, so the overlay carries that
          // wrapper's class and keeps its scoped preview styles.
        }
        {createPortal(
          <DragOverlay zIndex={2000} dropAnimation={null} className="xblock-games-editor">
            {activeCard ? renderOverlayCard(activeCard) : null}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>
    </DeckDragContext.Provider>
  );
};

interface DroppableZoneProps {
  deckId: string;
  droppableId: string;
  className?: string;
  children?: React.ReactNode;
}

const DroppableZone = ({ deckId, droppableId, className, children }: DroppableZoneProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { kind: 'deck', deckId },
  });
  return (
    <div
      ref={setNodeRef}
      data-dnd-id={droppableId}
      className={[className, isOver ? 'deck-outline-drop-active' : ''].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
};

/**
 * A deck header as a drop target. Hovering a collapsed deck asks the outline to
 * open it; the request is made once per hover so it cannot loop.
 */
export const DeckDropTarget = ({
  deckId,
  isExpanded,
  onRequestExpand,
  children,
}: {
  deckId: string;
  isExpanded: boolean;
  onRequestExpand: () => void;
  children: React.ReactNode;
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: deckDroppableId(deckId),
    data: { kind: 'deck', deckId },
  });
  const requestedRef = React.useRef(false);

  React.useEffect(() => {
    if (!isOver) {
      requestedRef.current = false;
      return;
    }
    if (isExpanded || requestedRef.current) { return; }
    requestedRef.current = true;
    onRequestExpand();
  }, [isOver, isExpanded, onRequestExpand]);

  return (
    <div
      ref={setNodeRef}
      data-dnd-id={deckDroppableId(deckId)}
      className={isOver ? 'deck-outline-drop-active' : undefined}
    >
      {children}
    </div>
  );
};

/**
 * The card rows of one deck: a `SortableContext` whose items come from the
 * preview tree, so a card moved here by a drag-over renders in this body.
 * The dragged row stays in place, dimmed, while the overlay follows the pointer.
 */
export const DeckCardList = ({
  deckId,
  renderCard,
}: {
  deckId: string;
  renderCard: (deck: Deck, card: Card, index: number) => React.ReactNode;
}) => {
  const intl = useIntl();
  const { previewDecks, activeCardId } = useDeckDragPreview();
  const deck = previewDecks.find((candidate) => candidate.id === deckId);
  if (!deck) { return null; }
  return (
    <>
      <SortableContext
        id={deckId}
        items={deck.cards.map((card) => card.id)}
        strategy={verticalListSortingStrategy}
      >
        {deck.cards.map((card, index) => (
          <div
            key={card.id}
            data-dnd-id={card.id}
            className={activeCardId === card.id ? 'deck-card-dragging' : undefined}
          >
            {renderCard(deck, card, index)}
          </div>
        ))}
      </SortableContext>
      {
        /* An empty deck, or one holding only its blank placeholder, gets a
          visible place to drop a card; the placeholder row itself stays. */
      }
      {deck.cards.every(isBlankCard) && (
        <DroppableZone
          deckId={deckId}
          droppableId={emptyZoneDroppableId(deckId)}
          className="deck-outline-empty p-3 text-muted text-center border border-light-700 rounded"
        >
          {intl.formatMessage(messages.dropCardHereLabel)}
        </DroppableZone>
      )}
    </>
  );
};
