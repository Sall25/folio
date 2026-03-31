import { findParentNodeClosestToPos } from "@tiptap/react";
import type { EditorView } from "prosemirror-view";

export function getTableContext(view: EditorView, event: MouseEvent) {
  const coords = { left: event.clientX, top: event.clientY };
  const pos = view.posAtCoords(coords);
  if (!pos) return null;

  const $pos = view.state.doc.resolve(pos.pos);

  const cell = findParentNodeClosestToPos(
    $pos,
    (node) =>
      node.type.name === "tableCell" || node.type.name === "tableHeader",
  );
  if (!cell) return null;

  const table = findParentNodeClosestToPos(
    $pos,
    (node) => node.type.name === "table",
  );
  if (!table) return null;

  return { cell, table };
}
