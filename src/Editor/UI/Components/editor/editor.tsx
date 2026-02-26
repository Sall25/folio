import './tiptap/tiptap.scss';
import './editor-colors.scss';
import './editor.scss';

import { forwardRef } from "react";

interface EditorProps {
  className?: string;
  children: React.ReactNode;
  ready?: boolean;
}

export const Editor = forwardRef<HTMLDivElement, EditorProps>((
  props,
  ref
) => {
  const {
    className = "editor",
    children,
    ready = false
  } = props

  return (
    <div
      data-ready={ready}
      ref={ref}
      className={className}
    >
      {children}
    </div>
  )
})

Editor.displayName = "EditorApp"