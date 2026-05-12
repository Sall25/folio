/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";

type DropSide = "left" | "right";

interface DropTarget {
  nodePos: number;
  side: DropSide;
  rect: DOMRect;
}

interface Props {
  editor: Editor;
}

export function ColumnDropIndicator({ editor }: Props) {
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dropTargetRef = useRef<DropTarget | null>(null);
  const dragNodePos = useRef<number | null>(null);
  const isDraggingRef = useRef(false); // ← ref so pointermove always sees current value

  useEffect(() => {
    dropTargetRef.current = dropTarget;
  }, [dropTarget]);

  useEffect(() => {
    const view = editor.view;

    const onDragStart = (e: Event) => {
      const { pos } = (e as CustomEvent).detail;
      dragNodePos.current = pos;
      isDraggingRef.current = true;
      setIsDragging(true);
      setDropTarget(null);
    };

    const onDragEnd = () => {
      const drop = dropTargetRef.current;
      const dragPos = dragNodePos.current;

      isDraggingRef.current = false;
      setIsDragging(false);
      setDropTarget(null);
      dragNodePos.current = null;

      if (drop && dragPos !== null) {
        // Wait a tick for ProseMirror to finish its own drop transaction first
        requestAnimationFrame(() => {
          applyColumnDrop(editor, dragPos, drop);
        });
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return; // ← reads ref, not stale closure

      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el) {
        setDropTarget(null);
        return;
      }

      const blockEl = el.closest(".ProseMirror > *") as HTMLElement | null;
      if (!blockEl || !view.dom.contains(blockEl)) {
        setDropTarget(null);
        return;
      }

      let pos: number;
      try {
        pos = view.posAtDOM(blockEl, 0);
      } catch {
        setDropTarget(null);
        return;
      }

      if (pos === dragNodePos.current) {
        setDropTarget(null);
        return;
      }

      const rect = blockEl.getBoundingClientRect();
      const third = rect.width / 3;
      const relX = e.clientX - rect.left;

      let side: DropSide | null = null;
      if (relX < third) side = "left";
      else if (relX > rect.width - third) side = "right";

      if (!side) {
        setDropTarget(null);
        return;
      }

      setDropTarget({ nodePos: pos, side, rect });
    };

    document.addEventListener("draghandle:dragstart", onDragStart);
    document.addEventListener("draghandle:dragend", onDragEnd);
    document.addEventListener("pointermove", onPointerMove);

    return () => {
      document.removeEventListener("draghandle:dragstart", onDragStart);
      document.removeEventListener("draghandle:dragend", onDragEnd);
      document.removeEventListener("pointermove", onPointerMove);
    };
  }, [editor]); // ← only re-run when editor changes, not isDragging

  if (!dropTarget || !isDragging) return null;

  const { rect, side } = dropTarget;
  const editorRect = editor.view.dom.getBoundingClientRect();
  const W = 3;

  const x =
    side === "left"
      ? rect.left - editorRect.left
      : rect.right - editorRect.left - W;

  return (
    <div
      style={{
        position: "absolute",
        top: rect.top - editorRect.top,
        left: x,
        width: W,
        height: rect.height,
        background: "var(--tt-brand-color-500)",
        borderRadius: 2,
        pointerEvents: "none",
        zIndex: 100,
      }}
    />
  );
}

function applyColumnDrop(editor: Editor, dragPos: number, drop: DropTarget) {
  const { state, dispatch } = editor.view;
  const { nodePos, side } = drop;

  const $drag = state.doc.resolve(dragPos);
  const dragNode = $drag.nodeAfter;
  if (!dragNode) return;

  const $target = state.doc.resolve(nodePos);
  const targetNode = $target.nodeAfter;
  if (!targetNode) return;

  const columnType = state.schema.nodes.column;
  const columnBlockType = state.schema.nodes.columnBlock;
  if (!columnType || !columnBlockType) return;

  const tr = state.tr;
  tr.delete(dragPos, dragPos + dragNode.nodeSize);

  const adjustedTargetPos =
    nodePos > dragPos ? nodePos - dragNode.nodeSize : nodePos;

  const $newTarget = tr.doc.resolve(adjustedTargetPos);
  const newTargetNode = $newTarget.nodeAfter;
  if (!newTargetNode) return;

  if (newTargetNode.type.name === "columnBlock") {
    const newCount = newTargetNode.childCount + 1;
    const newWidth = `${Math.round(100 / newCount)}%`;
    const existingColumns: any[] = [];
    newTargetNode.forEach((col: any) => {
      existingColumns.push(columnType.create({ width: newWidth }, col.content));
    });
    const newColumn = columnType.create({ width: newWidth }, dragNode.content);
    const columns =
      side === "left"
        ? [newColumn, ...existingColumns]
        : [...existingColumns, newColumn];
    tr.replaceWith(
      adjustedTargetPos,
      adjustedTargetPos + newTargetNode.nodeSize,
      columnBlockType.create({}, columns),
    );
  } else {
    const dragColumn = columnType.create({ width: "50%" }, dragNode.content);
    const targetColumn = columnType.create(
      { width: "50%" },
      newTargetNode.content,
    );
    const columns =
      side === "left" ? [dragColumn, targetColumn] : [targetColumn, dragColumn];
    tr.replaceWith(
      adjustedTargetPos,
      adjustedTargetPos + newTargetNode.nodeSize,
      columnBlockType.create({}, columns),
    );
  }

  dispatch(tr);
}
