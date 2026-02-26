import { Bold as BoldIcon } from "lucide-react";
import BubbleButton from "../../BubbleButton/BubbleButton";
import { useMarkContext } from "../context/markContext";
import { useEditorState } from "@tiptap/react";


export default function Bold() {

  const { editor } = useMarkContext();

  const { boldActive } = useEditorState({
    editor,
    selector: (ctx) => {
      return {
        boldActive: ctx.editor.isActive('bold') ?? false
      }
    }
  })

  return (
    <BubbleButton
      active={boldActive}
      onClick={() => editor.chain().focus().toggleBold().run()}
    >
      <BoldIcon
        className="tiptap-button-icon"
      />


    </BubbleButton>
  )
}