import { Code as CodeIcon } from "lucide-react";
import { useMarkContext } from "../context/markContext";
import { useEditorState } from "@tiptap/react";
import { BubbleButton } from "../../BubbleButton";

export function Code() {
  const { editor } = useMarkContext();

  const { codeActive } = useEditorState({
    editor,
    selector: ctx => {
      return {
        codeActive: ctx.editor.isActive('code') ?? false
      }
    }
  });

  return (
    <BubbleButton
      active={codeActive}
      onClick={() => editor.chain().focus().toggleCode().run()}
    >
      <CodeIcon className="icon" />
    </BubbleButton>
  );
}