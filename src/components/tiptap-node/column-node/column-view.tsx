import {
  NodeViewWrapper,
  NodeViewContent,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { useEffect, useState, type Ref } from "react";
import { useResizableNode } from "../figure-node";

export default function ColumnView(props: ReactNodeViewProps) {
  const [hasBeenResized, setHasBeenResized] = useState(false);

  const { nodeRef, handleResizeStart, isResizing } = useResizableNode();

  useEffect(() => {
    if (isResizing) {
      requestAnimationFrame(() => setHasBeenResized(true));
    }

    // Broadcast resize state to anyone listening on the document
    document.dispatchEvent(
      new CustomEvent("column:resize", { detail: { isResizing } }),
    );
  }, [isResizing]);

  return (
    <NodeViewWrapper
      as="div"
      ref={nodeRef as unknown as Ref<HTMLDivElement>}
      data-type="column"
      // resizing={isResizing ? "true" : undefined}
      style={{
        position: "relative",
        flexBasis: props.node.attrs.width,
        flexGrow: 0,
        flexShrink: 0,
        minWidth: 0,
        //width: "50px",
      }}
      className={hasBeenResized ? "resized" : ""}
      // onMouseLeave={handleMouseLeave}
    >
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
          if (nodeRef && nodeRef.current) {
            const currentPx = nodeRef.current.getBoundingClientRect().width;
            nodeRef.current.style.flexBasis = `${currentPx}px`;
            nodeRef.current.style.width = `${currentPx}px`;
          }
          handleResizeStart?.(event, "right");
        }}
        onTouchStart={(event) => {
          if (nodeRef && nodeRef.current) {
            const currentPx = nodeRef.current.getBoundingClientRect().width;
            nodeRef.current.style.flexBasis = `${currentPx}px`;
            nodeRef.current.style.width = `${currentPx}px`;
          }
          handleResizeStart?.(event, "right");
        }}
        className={`column-resizer`}
      />
    </NodeViewWrapper>
  );
}
