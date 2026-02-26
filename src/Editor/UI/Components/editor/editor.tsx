import './tiptap/tiptap.scss';
import './editor-colors.scss';
import './editor.scss';

import { forwardRef } from "react";

interface EditorProps {
  className?: string;
  children: React.ReactNode;
}

export const Editor = forwardRef<HTMLDivElement, EditorProps>((
  props,
  ref
) => {
  const {
    className = "editor",
    children
  } = props

  return (
    <div
      ref={ref}
      className={className}
    >
      {children}
    </div>
  )
})

Editor.displayName = "EditorApp"