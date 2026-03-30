// extensions/FigureView.tsx
import {
  NodeViewWrapper,
  NodeViewContent,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { useResizableNode } from "./resize-node-context";
import type { FigureNodeViewOptions } from "./types";
import { ResizableNodeHandle } from "./resize-node-handle";
import { ResizableNodeProvider } from "./resize-node-provider";
import { NodeSelection } from "@tiptap/pm/state";

import "./figure-view.scss";
import { useHoverMenu } from "@/components/tiptap-ui/color-dropdown-menu/useHoverMenu";

function FigureViewContent({
  node,
  extension,
  editor,
  getPos,
}: ReactNodeViewProps) {
  const { src, alt, nodeAlign: align, showCaption } = node.attrs;

  const { nodeRef, isResizing } = useResizableNode();

  const options = extension.options as FigureNodeViewOptions;

  // Then inside handleClick:
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleClick = (e: any) => {
    // Don't steal selection if the user clicked inside the caption
    if ((e.target as HTMLElement).closest("figcaption")) return;

    const pos = getPos?.();
    if (pos === undefined) return;
    const { state, dispatch } = editor.view;
    dispatch(state.tr.setSelection(NodeSelection.create(state.doc, pos)));
    editor.view.focus();
  };

  // Caption is empty when there's no text content
  const isCaptionEmpty = (() => {
    if (node.childCount === 0) return true;
    const figcaption = node.child(0); // figcaption is the only child
    return figcaption.content.size === 0;
  })();

  const { open, handleMouseEnter, handleMouseLeave } = useHoverMenu();

  return (
    <NodeViewWrapper
      style={{
        width: "fit-content",
        height: "fit-content",
        pointerEvents: "auto",
        borderRadius: "4px",
        transition: "outline 0.1s ease",
      }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      as="div"
    >
      <figure
        ref={nodeRef}
        style={{
          cursor: isResizing ? "ew-resize" : "default",
          transition: isResizing
            ? "none"
            : "width 120ms ease, height 120ms ease",
        }}
        data-align={align}
      >
        {open && (
          <>
            {options.directions?.map((dir, index) => (
              <ResizableNodeHandle key={index} direction={dir} />
            ))}
          </>
        )}

        <img
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            cursor: isResizing ? "ew-resize" : "default",
          }}
          src={src}
          alt={alt ?? ""}
          draggable={false}
        />
        <NodeViewContent
          onClick={(e) => e.stopPropagation()}
          className="caption"
          data-placeholder="Add a caption..."
          data-empty={isCaptionEmpty ? "true" : undefined}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          as={"figcaption" as any}
          style={{
            display: showCaption ? "block" : "none", //  hide, never unmount
          }}
        />
      </figure>
    </NodeViewWrapper>
  );
}

export default function FigureView(props: ReactNodeViewProps) {
  const { min, max, preserveAspectRatio } = props.extension
    .options as FigureNodeViewOptions;
  return (
    <ResizableNodeProvider
      min={min}
      max={max}
      shouldPreserveAspectRatio={preserveAspectRatio}
    >
      <FigureViewContent {...props} />
    </ResizableNodeProvider>
  );
}

//  <NodeViewWrapper
//         style={{
//           width: "100%",
//         }}
//         as="div"
//       >
//         <figure
//           ref={containerRef}
//           className="figure"
//           style={{
//             width: `${elementDimensions.width}px`,
//             height: `${elementDimensions.height}px`,
//             display: "inline-block",
//             maxWidth: "100%",
//             position: "relative",
//             margin: 0,
//           }}
//           data-align={align}
//         >
//           <>
//             {options.directions?.map((dir, index) => (
//               <ResizableNodeHandle key={index} direction={dir} />
//             ))}
//           </>
//           <img
//             src={src}
//             alt={alt ?? ""}
//             style={{ display: "block", width: "100%" }}
//             draggable={false}
//           />

//           {/* Editable caption — maps to node's inline* content */}
//           <NodeViewContent
//             // eslint-disable-next-line @typescript-eslint/no-explicit-any
//             as={"figcaption" as any}
//             className="figure-node-content"
//             style={{
//               textAlign: "center",
//               fontSize: "0.85rem",
//               color: "#888",
//               fontStyle: "italic",
//               marginTop: "6px",
//               outline: "none",
//             }}
//           />
//         </figure>
//       </NodeViewWrapper>
