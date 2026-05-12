import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import { useState } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";

export function TextCellNodeView({ node, editor, getPos }: NodeViewProps) {
  const [textContent, setTextContent] = useState(node.textContent);
  const [editing, setEditing] = useState(false);

  return (
    <NodeViewWrapper
      as="div"
      data-type="text-cell"
      style={{ borderRight: "1px solid var(--tt-border-color)" }}
    >
      {editing ? (
        <input
          style={{ width: "100%" }}
          autoFocus={true}
          placeholder="New Page"
          value={textContent}
          onChange={(e) => {
            setTextContent(e.target.value);
          }}
          onBlur={() => setEditing(false)}
          className="title-cell-input"
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            if (!textContent.trim()) return;
            const pos = getPos?.();
            if (pos == null) return;
            const { tr } = editor.state;
            tr.insertText(textContent, pos + 1, pos + 1 + node.content.size);
            editor.view.dispatch(tr);
          }}
        />
      ) : (
        <Button
          variant="ghost"
          style={{
            background: "transparent",
            width: "100%",
            justifyContent: "flex-start",
          }}
          onClick={() => setEditing(true)}
        >
          <span className="tiptap-button-text">{node.textContent || ""}</span>
        </Button>
      )}
    </NodeViewWrapper>
  );
}
