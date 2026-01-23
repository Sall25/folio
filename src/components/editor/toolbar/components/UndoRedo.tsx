import { Editor, useEditorState } from "@tiptap/react";
import { Redo, Undo } from "lucide-react";
import Button from "./Button";


export default function UndoRedoComponent({ editor }: { editor: Editor }) {

  const { canUndo, canRedo } = useEditorState({
    editor,
    selector: ctx => {
      return {
        canUndo: ctx.editor.can().chain().focus().undo().run(),
        canRedo: ctx.editor.can().chain().focus().redo().run()
      }
    }
  });

  if (!editor) return null;

  return (
    <div
      className="flex items-center gap-1.5"
    >
      <Button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!canUndo}
      >
        <Undo className="w-4 h-5" />
      </Button>

      <Button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!canRedo}
      >
        <Redo className="w-4 h-5" />
      </Button>
    </div>
  );
}