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
import { useCallback, useEffect, useRef, useState, type Ref } from "react";
import { useResizableNode } from "../figure-node";

export default function ColumnView(props: ReactNodeViewProps) {
  const [hasBeenResized, setHasBeenResized] = useState(false);
  const { editor } = props;
  const timerRef = useRef<number | null>(null);

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

  // const isMenuOpenRef = useRef(false);

  // useEffect(() => {
  //   const handler = (e: Event) => {
  //     isMenuOpenRef.current = (e as CustomEvent).detail.isOpen;
  //     console.log("isMenuOpenRef", isMenuOpenRef);
  //     console.log("received draghandle:menu", (e as CustomEvent).detail.isOpen);
  //   };
  //   document.addEventListener("draghandle:menu", handler);
  //   return () => document.removeEventListener("draghandle:menu", handler);
  // }, []);

  // const handleMouseLeave = useCallback(
  //   (e: React.MouseEvent) => {
  //     const related = e.relatedTarget as HTMLElement | null;
  //     const landedOnColumn =
  //       related?.hasAttribute("data-node-view-content") ||
  //       related?.classList.contains("column-resizer");
  //     console.log("landed on", landedOnColumn);

  //     // Always clear any previous pending unlock
  //     if (timerRef.current) {
  //       clearTimeout(timerRef.current);
  //       timerRef.current = null;
  //     }

  //     editor.commands.lockDragHandle();

  //     if (landedOnColumn) {
  //       //  editor.commands.lockDragHandle();
  //       timerRef.current = window.setTimeout(() => {
  //         if (!isMenuOpenRef.current) {
  //           editor.commands.unlockDragHandle();
  //         }
  //         timerRef.current = null;
  //       }, 350);
  //     } else {
  //       // Left the entire column group
  //       editor.commands.unlockDragHandle();
  //     }
  //   },
  //   [editor],
  // );

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
