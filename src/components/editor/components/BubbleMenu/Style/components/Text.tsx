import { Type } from "lucide-react";
import { useStyleContext } from "../context/styleContext";
import { useEditorState } from "@tiptap/react";

export function Text() {

  const { editor } = useStyleContext();

  const { isTextActive } = useEditorState({
    editor,
    selector: ctx => {
      return {
        isTextActive: ctx.editor.isActive('paragraph') ?? false
      }
    }
  })

  return (
    <span
      onClick={() =>
        editor.chain().focus().setParagraph().run()
      }
      className={`dropdown-item ${isTextActive}`}
    >
      <Type className="w-4 h-4" />
      <span>Text</span>
    </span>
  );
}