import { Editor } from "@tiptap/react";
import type { PropsWithChildren } from "react";

interface ToolbarButtonProps {
  children: PropsWithChildren['children'];
  editor: Editor;
  toggleMark: (editor: Editor) => void;
  active?: boolean;
}

export default function ToolbarButton({
  children,
  editor,
  toggleMark,
  active = false,
}: ToolbarButtonProps) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault(); // keep editor focus
        toggleMark(editor);
      }}
      className={`
        flex items-center justify-center
        w-6 h-6 rounded-md
        transition-colors
        hover:bg-neutral-100 dark:hover:bg-neutral-700
        ${active
          ? 'text-cyan-500 dark:text-cyan-600 bg-neutral-100 dark:bg-neutral-700'
          : 'text-neutral-600'
        }
      `}
    >
      {children}
    </button>
  );
}

