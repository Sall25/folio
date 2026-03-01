import { ThemeToggle } from "../Theme";

import { Editor, useEditorState } from "@tiptap/react";
import { Redo, Undo } from "lucide-react";

import { Card, CardBody, CardItemGroup } from "../Components/card";
import { Separator } from "../Components/separator";
import { Button } from "../Components";

// interface ButtonProps {
//   children: ReactNode;
//   onClick?: () => void;
//   className?: string;
//   active?: boolean;
//   disabled?: boolean;
// }

// function Button({
//   children,
//   disabled,
//   onClick,
// }: ButtonProps) {
//   return (
//     <button
//       type="button"
//       onClick={onClick}
//       disabled={disabled}
//       className='toolbar-button'
//     >
//       {children}
//     </button>
//   );
// }

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
    <CardItemGroup
      orientation="horizontal"
    >

      <Button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!canUndo}
      >
        <Undo
          size={16}
          className="tiptap-button-icon"
        />
      </Button>

      <Button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!canRedo}
      >
        <Redo
          size={16}
          className="tiptap-button-icon"
        />
      </Button>
    </CardItemGroup>
  );
}

export function Toolbar({ editor }: { editor: Editor }) {
  return (
    <Card
      className="toolbar"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        borderRadius: '0',
        //boxShadow: 'none',
        zIndex: 10,
        transition: 'none',
        marginBottom: '34px'
        // display: 'flex',
        // flexDirection: 'row',
        // justifyContent: 'flex-start'
      }}
    >
      <CardBody
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
          width: '100%',
          transition: 'none'
        }}
      >
        <CardItemGroup
          orientation="horizontal"
        >
          <UndoRedoComponent
            editor={editor}
          />

          <Separator
            orientation="vertical"
          />
          <ThemeToggle />
          <Separator
            orientation="vertical"
          />

          <Profile />
        </CardItemGroup>
      </CardBody>
    </Card>
    // <div
    //   className="toolbar">
    //   <UndoRedoComponent editor={editor} />
    //   <span className="toolbar-divider"></span>
    //   <ThemeToggle />
    //   <span className="toolbar-divider"></span>
    //   <Profile />

    // </div>
  );
}