import type { Side } from "./canvas-geometry";

/** How wide a block sits on the canvas until someone resizes it. */
export const DEFAULT_BLOCK_WIDTH = 260;
/** Narrow enough to be a label, wide enough to still hold a word. */
export const MIN_BLOCK_WIDTH = 96;

/** How tall the canvas block is in the page, until someone resizes it. */
export const DEFAULT_CANVAS_HEIGHT = 520;
export const MIN_CANVAS_HEIGHT = 220;
export const MAX_CANVAS_HEIGHT = 1400;

/**
 * Which block types can carry a canvas position. Every one of them gains four
 * attributes; a block that never lands on a canvas keeps them null, so this
 * list can be long without costing anything.
 */
export const POSITIONABLE_TYPES = [
  "paragraph",
  "heading",
  "blockquote",
  "codeBlock",
  "bulletList",
  "orderedList",
  "taskList",
  "callout",
  "figure",
  "image",
  "imageNode",
  "video",
  "audio",
  "file",
  "bookmark",
  "table",
  "container",
  "button",
  "pageLink",
  "blockRef",
  "inlineDatabase",
  "databaseTable",
  "databaseBoard",
  "databaseGallery",
  "mathBlock",
  "codeGroup",
  "tabs",
  "question",
];

/** One link between two blocks on the same canvas. */
export interface CanvasEdge {
  id: string;
  /** canvasId of the block the edge leaves. */
  from: string;
  /** canvasId of the block the edge reaches. */
  to: string;
  fromSide: Side;
  toSide: Side;
  label?: string;
}

const SIDES = new Set(["top", "right", "bottom", "left"]);

function asSide(value: unknown, fallback: Side): Side {
  return typeof value === "string" && SIDES.has(value)
    ? (value as Side)
    : fallback;
}

/**
 * Edges come back from an attribute, which means from the document, which
 * means from anyone who has ever edited the page: read them defensively and
 * drop what doesn't make sense rather than throwing inside a node view.
 */
export function parseEdges(value: unknown): CanvasEdge[] {
  let raw: unknown = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const out: CanvasEdge[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const e = item as Record<string, unknown>;
    const from = typeof e.from === "string" ? e.from : "";
    const to = typeof e.to === "string" ? e.to : "";
    if (!from || !to || from === to) continue;
    const id = typeof e.id === "string" && e.id ? e.id : `${from}>${to}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      from,
      to,
      fromSide: asSide(e.fromSide, "right"),
      toSide: asSide(e.toSide, "left"),
      label: typeof e.label === "string" ? e.label : undefined,
    });
  }
  return out;
}

/**
 * Link two blocks. One link per direction: dragging the same pair again moves
 * the existing link to the sides just used rather than stacking a second edge
 * on top of the first, where it would be invisible and uncuttable.
 */
export function linkEdges(
  edges: CanvasEdge[],
  edge: CanvasEdge,
): CanvasEdge[] {
  if (!edge.from || !edge.to || edge.from === edge.to) return edges;
  const kept = edges.filter(
    (e) => !(e.from === edge.from && e.to === edge.to),
  );
  const previous = edges.find(
    (e) => e.from === edge.from && e.to === edge.to,
  );
  // Keep what the old link said, so re-dragging it doesn't lose the label.
  return [...kept, { ...edge, label: edge.label ?? previous?.label }];
}

export function labelEdges(
  edges: CanvasEdge[],
  id: string,
  label: string,
): CanvasEdge[] {
  const text = label.trim();
  return edges.map((e) =>
    e.id === id ? { ...e, label: text || undefined } : e,
  );
}

export function unlinkEdges(edges: CanvasEdge[], id: string): CanvasEdge[] {
  return edges.filter((e) => e.id !== id);
}

/** A new id for a block or an edge. */
export function canvasId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
