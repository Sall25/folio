import { Editor } from "@tiptap/react";
import type { PropsWithChildren } from "react";

interface ToolbarButtonProps {
  children: PropsWithChildren['children'];
  editor?: Editor;
  toggleMark?: (editor?: Editor) => void;
  active?: boolean;
  onClick?: () => void;
}

export default function ToolbarButton({
  children,
  editor,
  toggleMark,
  active = false,
  onClick
}: ToolbarButtonProps) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault(); // keep editor focus
        if (toggleMark) {
          toggleMark(editor);
        }
        console.log('called')
      }}
      className={`
        flex items-center justify-center
        w-6 h-6 rounded-md
        transition-colors
        hover:bg-neutral-100 dark:hover:bg-neutral-800
        ${active
          ? 'text-cyan-500 dark:text-cyan-600 bg-neutral-100 dark:bg-neutral-700'
          : 'text-neutral-600 dark:text-neutral-200'
        }
      `}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

