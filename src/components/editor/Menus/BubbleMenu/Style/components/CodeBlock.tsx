import { useStyleContext } from "../context/styleContext";
import { useEditorState } from "@tiptap/react";
import { Code2 } from "lucide-react";

export function CodeBlock() {
  const { editor } = useStyleContext();

  const { codeBlockActive } = useEditorState({
    editor,
    selector: ctx => {
      return {
        codeBlockActive: ctx.editor.isActive('codeBlock') ?? false
      }
    }
  })

  return (

    <span
      onClick={() =>
        editor.chain().focus().toggleCodeBlock().run()
      }
      className={`dropdown-item ${codeBlockActive ? 'selected' : ''}`}
    >
      <Code2
        className="icon"
        size={16}
      />
      <span>CodeBlock</span>

    </span>

  );
}
