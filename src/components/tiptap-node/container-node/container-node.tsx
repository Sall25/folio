import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  NodeViewContent,
  type NodeViewProps,
} from "@tiptap/react";
import { useContext, type CSSProperties, type Ref } from "react";
import { useEditorEditable } from "../button-node/use-editor-editable";
import { ResizableNodeProvider } from "../figure-node";
import { ResizableNodeContext } from "../figure-node/resize-node-context";
import "./container-node.scss";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    container: {
      insertContainer: () => ReturnType;
    };
  }
}

// The box itself. Reads the resize context (present only in edit mode, where it's
// wrapped in ResizableNodeProvider) for the live nodeRef + drag starter. Holds
// block* content, so any node — columns, images, buttons — can be nested inside.
function ContainerBox({
  editable,
  width,
  backgroundColor,
  color,
}: {
  editable: boolean;
  width: number | null;
  backgroundColor?: string;
  color?: string;
}) {
  const resize = useContext(ResizableNodeContext);
  const nodeRef = resize?.nodeRef;
  const startResize = resize?.handleResizeStart;

  const style: CSSProperties = {
    position: "relative",
    width: width ? `${width}px` : "100%",
    maxWidth: "100%",
    backgroundColor,
    color,
  };

  return (
    <div
      ref={nodeRef as Ref<HTMLDivElement> | undefined}
      className="folio-container"
      style={style}
    >
      <NodeViewContent className="folio-container__content" />

      {editable && startResize && (
        <span
          className="folio-container__resize"
          contentEditable={false}
          onMouseDown={(e) => startResize(e, "right")}
          onTouchStart={(e) => startResize(e, "right")}
          aria-hidden="true"
        >
          <span className="folio-container__resize-grip" />
        </span>
      )}
    </div>
  );
}

function ContainerView({ node, editor, updateAttributes }: NodeViewProps) {
  const { width, backgroundColor, color, nodeAlign } = node.attrs as {
    width: number | null;
    backgroundColor?: string;
    color?: string;
    nodeAlign?: string;
  };
  const editable = useEditorEditable(editor);

  // nodeAlign positions the (possibly resized) box within its column.
  const wrapStyle: CSSProperties = {
    width: "100%",
    display: "flex",
    justifyContent: nodeAlign || undefined,
  };

  if (!editable) {
    return (
      <NodeViewWrapper
        as="div"
        className="folio-container-wrap"
        data-type="container"
        style={wrapStyle}
      >
        <ContainerBox
          editable={false}
          width={width}
          backgroundColor={backgroundColor}
          color={color}
        />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      as="div"
      className="folio-container-wrap"
      data-type="container"
      style={wrapStyle}
    >
      <ResizableNodeProvider
        min={{ width: 120 }}
        onResizeEnd={({ width: w }) =>
          updateAttributes({ width: Math.round(w) })
        }
      >
        <ContainerBox
          editable
          width={width}
          backgroundColor={backgroundColor}
          color={color}
        />
      </ResizableNodeProvider>
    </NodeViewWrapper>
  );
}

export const Container = Node.create({
  name: "container",
  group: "block",
  content: "block*",
  isolating: true,
  draggable: true,

  addAttributes() {
    return {
      width: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="container"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "container" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ContainerView);
  },

  addCommands() {
    return {
      insertContainer:
        () =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: "container",
              content: [{ type: "paragraph" }],
            })
            .run(),
    };
  },
});
