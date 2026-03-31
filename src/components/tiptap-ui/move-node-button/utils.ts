/* eslint-disable @typescript-eslint/no-explicit-any */
import { Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import type { MoveDirection } from "./types";

// ─── Table Helpers ────────────────────────────────────────────────────────────

/**
 * Returns true if the current selection is inside a tableCell or tableHeader.
 */
export function isInsideTableCell(editor: Editor): boolean {
  const { from } = editor.state.selection;
  const $from = editor.state.doc.resolve(from);
  for (let d = $from.depth; d > 0; d--) {
    const name = $from.node(d).type.name;
    if (name === "tableCell" || name === "tableHeader") return true;
  }
  return false;
}

/**
 * Walks up the resolved position to find an ancestor node by type name.
 * Returns { node, pos, depth } or null.
 */
function findAncestorByType(
  editor: Editor,
  pos: number,
  typeName: string,
): { node: any; pos: number; depth: number } | null {
  const $pos = editor.state.doc.resolve(pos);
  for (let depth = $pos.depth; depth > 0; depth--) {
    const node = $pos.node(depth);
    if (node.type.name === typeName) {
      return { node, pos: $pos.before(depth), depth };
    }
  }
  return null;
}

/**
 * Checks whether the table row containing the cursor can move in `direction`.
 */
export function canMoveTableRow(
  editor: Editor,
  direction: MoveDirection,
): boolean {
  const { from } = editor.state.selection;
  const rowInfo = findAncestorByType(editor, from, "tableRow");
  if (!rowInfo) return false;

  const tableInfo = findAncestorByType(editor, from, "table");
  if (!tableInfo) return false;

  let rowIndex = -1;
  let totalRows = 0;

  tableInfo.node.forEach((child: any) => {
    if (child.type.name === "tableRow") {
      if (child === rowInfo.node) rowIndex = totalRows;
      totalRows++;
    }
  });

  if (rowIndex === -1) return false;
  return direction === "up" ? rowIndex > 0 : rowIndex < totalRows - 1;
}

/**
 * Moves the current table row up or down.
 * Returns true if successful.
 */
export function moveTableRow(
  editor: Editor,
  direction: MoveDirection,
): boolean {
  if (!canMoveTableRow(editor, direction)) return false;

  const { state, view } = editor;
  const { from } = state.selection;

  const rowInfo = findAncestorByType(editor, from, "tableRow");
  if (!rowInfo) return false;

  const { pos: rowPos, node: rowNode } = rowInfo;
  const rowSize = rowNode.nodeSize;

  const tr = state.tr;

  if (direction === "up") {
    const $beforeRow = state.doc.resolve(rowPos);
    const prevRowNode = $beforeRow.nodeBefore;
    if (!prevRowNode || prevRowNode.type.name !== "tableRow") return false;

    const prevRowStart = rowPos - prevRowNode.nodeSize;

    // Remove current row, insert it before the previous row
    tr.delete(rowPos, rowPos + rowSize);
    tr.insert(prevRowStart, rowNode);
  } else {
    const nextRowStart = rowPos + rowSize;
    const $afterRow = state.doc.resolve(nextRowStart);
    const nextRowNode = $afterRow.nodeAfter;
    if (!nextRowNode || nextRowNode.type.name !== "tableRow") return false;

    // Remove current row, insert it after the next row
    tr.delete(rowPos, rowPos + rowSize);
    tr.insert(rowPos + nextRowNode.nodeSize, rowNode);
  }

  // Remap selection so focus stays in the moved row
  const mappedSelection = state.selection.map(tr.doc, tr.mapping);
  tr.setSelection(mappedSelection);
  tr.scrollIntoView();

  view.dispatch(tr);
  return true;
}

// ─── Generic Block-Level Move Helpers ────────────────────────────────────────

/**
 * Resolves which top-level (or block-level) node is "selected".
 * Handles both NodeSelection and TextSelection.
 */
function resolveSelectedBlockPos(
  editor: Editor,
): { pos: number; node: any } | null {
  const { state } = editor;
  const { selection } = state;

  // NodeSelection: a node is explicitly selected
  if (selection instanceof NodeSelection) {
    return { pos: selection.from, node: selection.node };
  }

  // TextSelection: walk up to find the nearest block ancestor
  const $from = selection.$from;
  for (let depth = $from.depth; depth >= 0; depth--) {
    const node = $from.node(depth);
    if (node.isBlock && depth > 0) {
      return { pos: $from.before(depth), node };
    }
  }

  return null;
}

/**
 * Checks whether the selected block-level node can move in the given direction.
 */
export function canMoveBlockNode(
  editor: Editor,
  direction: MoveDirection,
): boolean {
  const resolved = resolveSelectedBlockPos(editor);
  if (!resolved) return false;

  const { pos, node } = resolved;
  const { doc } = editor.state;
  const nodeSize = node.nodeSize;

  if (direction === "up") {
    if (pos === 0) return false;
    const $before = doc.resolve(pos);
    return !!$before.nodeBefore;
  } else {
    const endPos = pos + nodeSize;
    if (endPos >= doc.content.size) return false;
    const $after = doc.resolve(endPos);
    return !!$after.nodeAfter;
  }
}

/**
 * Moves the selected block-level node up or down in the document.
 * Returns true if successful.
 */
export function moveBlockNode(
  editor: Editor,
  direction: MoveDirection,
): boolean {
  if (!canMoveBlockNode(editor, direction)) return false;

  const { state, view } = editor;
  const { doc } = state;

  const resolved = resolveSelectedBlockPos(editor);
  if (!resolved) return false;

  const { pos, node } = resolved;
  const nodeSize = node.nodeSize;
  const tr = state.tr;

  if (direction === "up") {
    const $before = doc.resolve(pos);
    const prevNode = $before.nodeBefore;
    if (!prevNode) return false;

    const prevStart = pos - prevNode.nodeSize;

    tr.delete(pos, pos + nodeSize);
    tr.insert(prevStart, node);
  } else {
    const endPos = pos + nodeSize;
    const $after = doc.resolve(endPos);
    const nextNode = $after.nodeAfter;
    if (!nextNode) return false;

    tr.delete(pos, pos + nodeSize);
    tr.insert(pos + nextNode.nodeSize, node);
  }

  const mappedSelection = state.selection.map(tr.doc, tr.mapping);
  tr.setSelection(mappedSelection);
  tr.scrollIntoView();

  view.dispatch(tr);
  return true;
}

// ─── Unified API ─────────────────────────────────────────────────────────────

/**
 * Can the currently selected node (block or table row) move in `direction`?
 */
export function canMoveNode(
  editor: Editor | null,
  direction: MoveDirection,
): boolean {
  if (!editor) return false;
  if (isInsideTableCell(editor)) return canMoveTableRow(editor, direction);
  return canMoveBlockNode(editor, direction);
}

/**
 * Moves the currently selected node (block or table row) in `direction`.
 * Returns true if successful.
 */
export function moveNode(
  editor: Editor | null,
  direction: MoveDirection,
): boolean {
  if (!editor) return false;
  if (isInsideTableCell(editor)) return moveTableRow(editor, direction);
  return moveBlockNode(editor, direction);
}
