// import {
//   NodeViewWrapper,
//   NodeViewContent,
//   type ReactNodeViewProps,
// } from "@tiptap/react";
// import { useState } from "react";

// export default function ColumnView({ node }: ReactNodeViewProps) {
//   const [isVisible, setVisible] = useState(false);

//   return (
//     <NodeViewWrapper
//       as="div"
//       data-type="column"
//       style={{
//         width: "100%",
//         // position: "absolute",
//         // border: "1px solid lightgreen",
//       }}
//       onMouseEnter={() => {
//         setVisible(true);
//         console.log("mouseenter");
//       }}
//       onMouseLeave={() => setVisible(false)}
//     >
//       <span className={`resize-handle ${isVisible ? "is-visible" : ""}`}>
//         R
//       </span>
//       <NodeViewContent as="div" />
//     </NodeViewWrapper>
//   );
// }

import {
  NodeViewWrapper,
  NodeViewContent,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { useEffect, useState, type Ref } from "react";
import { useResizableNode } from "../figure-node";

export default function ColumnView(props: ReactNodeViewProps) {
  const [isVisible, setVisible] = useState(false);
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
        flexBasis: `100%`,
        flexGrow: 0,
        flexShrink: 0,
        minWidth: 0,
        //width: "50px",
      }}
      className={hasBeenResized ? "resized" : ""}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <NodeViewContent
        as="div"
        style={{
          width: "100%",
          minHeight: "1lh",
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
