import { Editor } from "@tiptap/react";
import type { PropsWithChildren } from "react";
import './BubbleButton.scss'

interface ButtonProps {
  children: PropsWithChildren['children'];
  editor?: Editor;
  toggleMark?: (editor?: Editor) => void;
  active?: boolean;
  onClick?: () => void;
}

export default function BubbleButton({
  children,
  editor,
  toggleMark,
  active = false,
  onClick
}: ButtonProps) {
  return (
    <span
      onMouseDown={(e) => {
        e.preventDefault(); // keep editor focus
        if (toggleMark) {
          toggleMark(editor);
        }
        console.log('called')
      }}
      className={`bubble-menu-button ${active ? 'is-active' : ''}`}
      onClick={onClick}
    >
      {children}
    </span>
  );
}

