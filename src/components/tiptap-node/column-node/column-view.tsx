import {
  NodeViewWrapper,
  NodeViewContent,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { useEffect, useState, type Ref } from "react";
import { ResizableNodeProvider, useResizableNode } from "../figure-node";
import "./column-view.scss";

function ColumnInner(props: ReactNodeViewProps) {
  const [hasBeenResized, setHasBeenResized] = useState(false);
  const { nodeRef, handleResizeStart, isResizing } = useResizableNode();

  useEffect(() => {
    if (isResizing) {
      requestAnimationFrame(() => setHasBeenResized(true));
    }
    document.dispatchEvent(
      new CustomEvent("column:resize", { detail: { isResizing } }),
    );
  }, [isResizing]);

  return (
    <NodeViewWrapper
      as="div"
      ref={nodeRef as unknown as Ref<HTMLDivElement>}
      data-type="column"
      style={{
        position: "relative",
        flexBasis: props.node.attrs.width,
        flexGrow: 1,
        flexShrink: 0,
        minWidth: 0,
      }}
      className={hasBeenResized ? "resized" : ""}
    >
      {/* Left drop zone */}
      <div
        className="column-drop-zone column-drop-zone--left"
        data-drop-zone="left"
        data-node-view-ignore
        contentEditable={false}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "20%",
          height: "100%",
          zIndex: 10,
        }}
      />

      {/* Right drop zone */}
      <div
        className="column-drop-zone column-drop-zone--right"
        data-drop-zone="right"
        data-node-view-ignore
        contentEditable={false}
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: "20%",
          height: "100%",
          zIndex: 10,
        }}
      />

      <NodeViewContent
        as="div"
        style={{
          width: "100%",
          minHeight: "5rem",
          display: "block",
        }}
        draggable={true}
      />
      <span
        onMouseDown={(event) => {
          if (nodeRef?.current) {
            const currentPx = nodeRef.current.getBoundingClientRect().width;
            nodeRef.current.style.flexBasis = `${currentPx}px`;
            nodeRef.current.style.width = `${currentPx}px`;
          }
          handleResizeStart?.(event, "right");
        }}
        onTouchStart={(event) => {
          if (nodeRef?.current) {
            const currentPx = nodeRef.current.getBoundingClientRect().width;
            nodeRef.current.style.flexBasis = `${currentPx}px`;
            nodeRef.current.style.width = `${currentPx}px`;
          }
          handleResizeStart?.(event, "right");
        }}
        className="column-resizer"
      />
    </NodeViewWrapper>
  );
}

export default function ColumnView(props: ReactNodeViewProps) {
  return (
    <ResizableNodeProvider
      min={{ width: 100 }}
      onResizeEnd={({ width }) => {
        // Use pos directly to avoid setNodeMarkup content validation
        const { state, dispatch } = props.editor.view;
        const pos = props.getPos?.();
        if (typeof pos !== "number") return;

        const node = state.doc.nodeAt(pos);
        if (!node) return;

        const tr = state.tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          width: `${width}px`,
        });
        dispatch(tr);
      }}
    >
      <ColumnInner {...props} />
    </ResizableNodeProvider>
  );
}
