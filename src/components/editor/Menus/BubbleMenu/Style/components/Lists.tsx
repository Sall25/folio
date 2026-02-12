import { useStyleContext } from "../context/styleContext";
import { List, ListOrdered } from "lucide-react";
import { useEditorState } from "@tiptap/react";

export function Lists() {
  const { editor } = useStyleContext();

  const { bulletActive, orderedActive } = useEditorState({
    editor,
    selector: ctx => {
      return {
        bulletActive: ctx.editor.isActive('bulletList') ?? false,
        orderedActive: ctx.editor.isActive('orderedList') ?? false
      }
    }
  })

  return (
    <>
      <span
        className={`dropdown-item ${bulletActive ? 'selected' : ''}`}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List
          className="icon"
          size={16}
        />
        <span>Bullet List</span>
      </span>
      <span
        className={`dropdown-item ${orderedActive ? 'selected' : ''}`}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered
          className="icon"
          size={16}
        />
        <span>Ordered list</span>
      </span>
    </>
  );
}
