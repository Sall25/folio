import { Strikethrough as StrikeIcon } from "lucide-react";
import BubbleButton from "../../BubbleButton/BubbleButton";
import { useMarkContext } from "../context/markContext";
import { useEditorState } from "@tiptap/react";


export default function Strike() {

  const { editor } = useMarkContext();

  const { strikeActive } = useEditorState({
    editor,
    selector: (ctx) => {
      return {
        strikeActive: ctx.editor.isActive('strike') ?? false
      }
    }
  })

  return (
    <BubbleButton
      active={strikeActive}
      onClick={() => editor.chain().focus().toggleStrike().run()}
    >
      <StrikeIcon
        className="tiptap-button-icon"
      />

    </BubbleButton>
  );
}