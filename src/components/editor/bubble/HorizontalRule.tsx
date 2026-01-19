import { Editor } from "@tiptap/react";
import { FaLine } from "react-icons/fa";


export default function HorizontalRule({ editor }: { editor: Editor }) {
  return (
    <button onClick={() => editor.chain().focus().setHorizontalRule().run()}>
      <FaLine className="w-4 h-4" />
    </button>
  );
}
