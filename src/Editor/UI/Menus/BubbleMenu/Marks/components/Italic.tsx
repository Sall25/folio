import { Italic as ItalicIcon } from "lucide-react";
import BubbleButton from "../../BubbleButton/BubbleButton";
import { useMarkContext } from "../context/markContext";
import { useEditorState } from "@tiptap/react";

export default function Italic() {


  const { editor } = useMarkContext();

  const { italicActive } = useEditorState({
    editor,
    selector: (ctx) => {
      return {
        italicActive: ctx.editor.isActive('italic') ?? false
      }
    }
  })


  return (
    <BubbleButton
      active={italicActive}
      onClick={() => editor.chain().focus().toggleItalic().run()}
    >
      <ItalicIcon
        className="tiptap-button-icon"
      />

    </BubbleButton>
  )
}