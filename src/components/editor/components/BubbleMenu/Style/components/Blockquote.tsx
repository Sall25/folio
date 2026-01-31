import { useEditorState } from "@tiptap/react";
import { useStyleContext } from "../context/styleContext";
import { Quote } from "lucide-react";

export function Blockquote() {
  const { editor } = useStyleContext();

  const { isQuoteActive } = useEditorState({
    editor,
    selector: ctx => {
      return {
        isQuoteActive: ctx.editor.isActive('blockquote') ?? false
      }
    }
  });

  return (
    <span
      onClick={() => editor.chain().focus().toggleBlockquote().run()}
      className={`dropdown-item ${isQuoteActive ? 'selected' : ''}`}
    >
      <Quote
        className="icon"
        size={20}
      />
      <span>Blockquote</span>
    </span>
  );
}