import { Editor } from "@tiptap/react";
import type { PropsWithChildren } from "react";

interface ToolbarButtonProps {
  children: PropsWithChildren['children'];
  editor: Editor;
  toggleMark: (editor: Editor) => void;
  active?: boolean;
}

export default function ToolbarButton({ children, editor, toggleMark, active = false }: ToolbarButtonProps) {
  return (
    <button onClick={() => toggleMark(editor)} className={`hover:bg-neutral-100 
    dark:hover:bg-neutral-700 
      w-6 h-5 flex justify-center py-1  my-auto rounded-md
      ${active ? 'text-cyan-500 dark:text-cyan-600' : 'text-neutral-500'}
    `}
    >
      {children}
    </button>
  );
}
