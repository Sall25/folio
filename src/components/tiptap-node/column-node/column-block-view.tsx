import {
  NodeViewWrapper,
  NodeViewContent,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { useCallback, useRef } from "react";

export default function ColumnBlockView({
  node,
  editor,
  getPos,
}: ReactNodeViewProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<{
    index: number;
    startX: number;
    leftStartWidth: number;
    rightStartWidth: number;
    totalWidth: number;
  } | null>(null);

  const handleResizerPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, index: number) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);

      const wrapper = wrapperRef.current;
      if (!wrapper) return;

      const columns = Array.from(
        wrapper.querySelectorAll<HTMLElement>(
          ":scope > .column-block-inner > [data-type='column']",
        ),
      );

      const leftCol = columns[index];
      const rightCol = columns[index + 1];
      if (!leftCol || !rightCol) return;

      const totalWidth = leftCol.offsetWidth + rightCol.offsetWidth;

      resizerRef.current = {
        index,
        startX: e.clientX,
        leftStartWidth: leftCol.offsetWidth,
        rightStartWidth: rightCol.offsetWidth,
        totalWidth,
      };
    },
    [],
  );

  const handleResizerPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const r = resizerRef.current;
      if (!r) return;

      const delta = e.clientX - r.startX;
      const newLeftWidth = Math.min(
        Math.max(r.leftStartWidth + delta, r.totalWidth * 0.1),
        r.totalWidth * 0.9,
      );
      const newRightWidth = r.totalWidth - newLeftWidth;

      const leftPct = `${((newLeftWidth / r.totalWidth) * 100).toFixed(2)}%`;
      const rightPct = `${((newRightWidth / r.totalWidth) * 100).toFixed(2)}%`;

      // Live DOM update for smooth resize
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const columns = Array.from(
        wrapper.querySelectorAll<HTMLElement>(
          ":scope > .column-block-inner > [data-type='column']",
        ),
      );
      if (columns[r.index]) columns[r.index].style.width = leftPct;
      if (columns[r.index + 1]) columns[r.index + 1].style.width = rightPct;
    },
    [],
  );

  const handleResizerPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, index: number) => {
      const r = resizerRef.current;
      if (!r) return;
      resizerRef.current = null;

      // Commit to ProseMirror doc
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const columns = Array.from(
        wrapper.querySelectorAll<HTMLElement>(
          ":scope > .column-block-inner > [data-type='column']",
        ),
      );

      const pos = getPos?.();
      if (pos === undefined) return;

      const { state, dispatch } = editor.view;
      let tr = state.tr;

      node.forEach((colNode, offset, i) => {
        const colPos = pos + 1 + offset;
        const domCol = columns[i];
        if (!domCol) return;
        tr = tr.setNodeMarkup(colPos, undefined, {
          ...colNode.attrs,
          width: domCol.style.width,
        });
      });

      dispatch(tr);
    },
    [editor, getPos, node],
  );

  const columnCount = node.childCount;

  return (
    <NodeViewWrapper as="div" ref={wrapperRef} data-type="column-block">
      <div className="column-block-inner">
        <NodeViewContent as="div" className="column-block-columns" />
        {/* Resize dividers — rendered between columns */}
        {/* {Array.from({ length: columnCount - 1 }, (_, i) => (
          <div
            key={i}
            className="column-resizer"
            style={{ left: `calc(${getColumnLeftPercent(node, i)}%)` }}
            onPointerDown={(e) => handleResizerPointerDown(e, i)}
            onPointerMove={handleResizerPointerMove}
            onPointerUp={(e) => handleResizerPointerUp(e, i)}
          />
        ))} */}
      </div>
    </NodeViewWrapper>
  );
}

function getColumnLeftPercent(node: ReactNodeViewProps["node"], index: number) {
  let acc = 0;
  node.forEach((col, _, i) => {
    if (i <= index) acc += parseFloat(col.attrs.width);
  });
  return acc;
}
