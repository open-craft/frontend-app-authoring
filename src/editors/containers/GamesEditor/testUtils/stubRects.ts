/**
 * jsdom has no layout: every element's rect is zero, so dnd-kit's measuring and
 * the sortable keyboard coordinate getter cannot find a target. Give the
 * droppable nodes distinct rects, keyed by the `data-dnd-id` their wrapper
 * carries, and restore the prototype afterwards.
 *
 * Ascending, non-overlapping `[top, bottom]` pairs keep arrow-key direction
 * unambiguous (the stock getter filters by `top`).
 */
export type StubbedRect = [top: number, bottom: number];

export const stubRects = (rects: Record<string, StubbedRect>, width = 800): () => void => {
  const original = HTMLElement.prototype.getBoundingClientRect;

  HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect(this: HTMLElement) {
    // A droppable sits inside its data-dnd-id wrapper. The drag overlay is
    // portalled outside every wrapper and dnd-kit measures its single child, so
    // it is measured through the row it renders - or, when the overlay's chrome
    // carries no data attribute (the editor's real preview row), through the
    // focused card's row, which is where a keyboard drag keeps focus.
    const draggedRow = () => document.activeElement?.closest<HTMLElement>('[data-dnd-id]') ?? null;
    const inOverlay = this.style?.position === 'fixed' || this.parentElement?.style?.position === 'fixed';
    const owner = this.closest<HTMLElement>('[data-dnd-id]')
      ?? (inOverlay ? (this.querySelector<HTMLElement>('[data-dnd-id]') ?? draggedRow()) : null);
    const [top, bottom] = (owner?.dataset.dndId && rects[owner.dataset.dndId]) || [0, 0];
    return {
      top,
      bottom,
      height: bottom - top,
      left: 0,
      right: width,
      width,
      x: 0,
      y: top,
      toJSON: () => ({}),
    } as DOMRect;
  };

  return () => {
    HTMLElement.prototype.getBoundingClientRect = original;
  };
};
