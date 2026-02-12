import { ThemeToggle } from "../../Theme";

import { Editor, useEditorState } from "@tiptap/react";
import { Redo, Undo } from "lucide-react";

import type { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  active?: boolean;
  disabled?: boolean;
}

function Button({
  children,
  disabled,
  onClick,
}: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className='toolbar-button'
    >
      {children}
    </button>
  );
}

function Profile() {
  return (
    <img className="profile" src="https://img.freepik.com/premium-photo/cartoon-game-avatar-logo-gaming-brand_902820-465.jpg" alt="pic" />
  )
}

function UndoRedoComponent({ editor }: { editor: Editor }) {

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
      className="undoRedoMenu"
    >
      <Button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!canUndo}
      >
        <Undo size={16} />
      </Button>

      <Button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!canRedo}
      >
        <Redo size={16} />
      </Button>
    </div>
  );
}

export default function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div
      className="toolbar">
      <UndoRedoComponent editor={editor} />
      <span className="toolbar-divider"></span>
      <ThemeToggle />
      <span className="toolbar-divider"></span>
      <Profile />

    </div>
  );
}