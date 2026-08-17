import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { useState, useContext, type CSSProperties, type Ref } from "react";
import { Settings2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { LinkPicker } from "src/components/tiptap-ui/link-picker/link-picker"; // adjust path
import { useEditorEditable } from "./use-editor-editable";
import { useActivePageActions } from "src/components/tiptap-templates/simple/context/active-page-context";
import { ResizableNodeProvider } from "../figure-node";
import { ResizableNodeContext } from "../figure-node/resize-node-context";
import "./button-node.scss";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    ctaButton: {
      insertButton: () => ReturnType;
    };
  }
}

const gearStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 26,
  height: 26,
  border: "1px solid var(--tt-border-color)",
  borderRadius: 6,
  background: "transparent",
  color: "var(--tt-text-secondary)",
  cursor: "pointer",
  flexShrink: 0,
};

// The button itself. Reads the resize context (present only in edit mode, where
// it's wrapped in ResizableNodeProvider) for the live nodeRef + drag starter.
function ButtonBody({
  className,
  label,
  width,
  editable,
  onActivate,
  backgroundColor = "var(--tt-color-highlight-gray)",
  justifyContent = "center",
  color = "var(--tt-text-primary)",
}: {
  className: string;
  label: string;
  width: number | null;
  editable: boolean;
  onActivate: () => void;
  backgroundColor?: string;
  justifyContent?: string;
  color?: string;
}) {
  const resize = useContext(ResizableNodeContext);
  const nodeRef = resize?.nodeRef;
  const startResize = resize?.handleResizeStart;

  return (
    <span
      ref={nodeRef as Ref<HTMLSpanElement> | undefined}
      className={className}
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate();
        }
      }}
      style={{
        position: "relative",
        cursor: "pointer",
        width: width ? `${width}px` : undefined,
        maxWidth: "100%",
        backgroundColor: backgroundColor,
        justifyContent,
        color,
      }}
    >
      {label || "Button"}

      {editable && startResize && (
        <span
          className="folio-button__resize"
          contentEditable={false}
          onMouseDown={(e) => startResize(e, "right")}
          onTouchStart={(e) => startResize(e, "right")}
          onClick={(e) => e.stopPropagation()}
          aria-hidden="true"
        >
          <span className="folio-button__resize-grip" />
        </span>
      )}
    </span>
  );
}

function ButtonView({ node, editor, updateAttributes }: NodeViewProps) {
  const { href, label, width } = node.attrs as {
    href: string | null;
    label: string;
    width: number | null;
  };
  const editable = useEditorEditable(editor);
  const [open, setOpen] = useState(false);
  const { setActivePageId } = useActivePageActions();

  const navigate = () => {
    if (!href) return;
    if (/^https?:\/\//i.test(href)) {
      window.open(href, "_blank", "noopener,noreferrer");
    } else {
      setActivePageId(href);
    }
  };

  // configured button follows its link; an unconfigured one opens settings.
  const handleClick = () => {
    if (editable && !href) {
      setOpen(true);
      return;
    }
    navigate();
  };

  const className = "folio-button";

  if (!editable) {
    return (
      <NodeViewWrapper
        as="div"
        className="folio-button-wrap"
        data-type="button"
        contentEditable={false}
      >
        <ButtonBody
          className={className}
          label={label}
          width={width}
          editable={false}
          onActivate={navigate}
          backgroundColor={node.attrs.backgroundColor}
          justifyContent={node.attrs.nodeAlign}
          color={node.attrs.color}
        />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      as="div"
      className="folio-button-wrap"
      data-type="button"
      contentEditable={false}
      style={{
        position: "relative",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 6,
        width: "100%",
      }}
    >
      <ResizableNodeProvider
        min={{ width: 80 }}
        onResizeEnd={({ width: w }) =>
          updateAttributes({ width: Math.round(w) })
        }
      >
        <ButtonBody
          className={className}
          label={label}
          width={width}
          editable
          onActivate={handleClick}
          backgroundColor={node.attrs.backgroundColor}
          justifyContent={node.attrs.nodeAlign}
          color={node.attrs.color}
        />
      </ResizableNodeProvider>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Button settings"
            className="folio-button__settings"
            data-open={open}
            style={gearStyle}
          >
            <Settings2 size={14} />
          </button>
        </PopoverTrigger>
        <PopoverPortal container={document.getElementById("root")}>
          <PopoverContent style={{ position: "fixed", zIndex: 999 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "10px 10px 0" }}>
                <input
                  placeholder="Button label"
                  value={label}
                  autoFocus
                  onChange={(e) => updateAttributes({ label: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    border: "1px solid var(--tt-border-color)",
                    borderRadius: 6,
                    fontSize: 13,
                    outline: "none",
                    background: "transparent",
                    color: "var(--tt-text-primary)",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <LinkPicker
                href={href ?? null}
                onChange={(h) => updateAttributes({ href: h })}
              />
            </div>
          </PopoverContent>
        </PopoverPortal>
      </Popover>
    </NodeViewWrapper>
  );
}

export const ButtonNode = Node.create({
  name: "ctaButton",
  group: "block",
  content: "block*",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      label: { default: "Button" },
      href: { default: null },
      width: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="button"]',
        getAttrs: (el) => ({
          label: (el as HTMLElement).textContent || "Button",
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "button" }),
      node.attrs.label ?? "",
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ButtonView);
  },

  addCommands() {
    return {
      insertButton:
        () =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: "ctaButton",
              attrs: { label: "Button" },
            })
            .run(),
    };
  },
});
