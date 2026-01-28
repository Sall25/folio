import { Underline as UnderlineIcon } from "lucide-react";
import BubbleButton from "../../BubbleButton/BubbleButton";
import { useMarkContext } from "../context/markContext";
import { useEditorState } from "@tiptap/react";

export default function Underline() {

  const { editor } = useMarkContext();

  const { underlineActive } = useEditorState({
    editor,
    selector: ctx => {
      return {
        underlineActive: ctx.editor.isActive('underline') ?? false
      }
    }
  });


  return (
    <BubbleButton
      active={underlineActive}
      onClick={() => editor.chain().focus().toggleUnderline().run()}
    >
      <UnderlineIcon className="icon" />

    </BubbleButton>
  );
}