import { useState, type ReactNode } from "react";
import { ColorContext, type RecentType } from "../context/colorContext";
import { Editor, useEditorState } from "@tiptap/react";

export default function ColorComponentBase({
  children,
  editor
}: {
  children: ReactNode
  editor: Editor
}) {

  const [recent, setRecent] = useState<RecentType>({ text: [], highlight: [] });

  const { currentColor, currentHighlight } = useEditorState({
    editor,
    selector: ctx => {
      return {
        currentColor: ctx.editor.getAttributes('textStyle').color ?? '#000000',
        currentHighlight: ctx.editor.getAttributes('textStyle').backgroundColor ?? '#000000'
      }
    }
  });

  const MAX_RECENT = 6

  function addRecentColor(color: { css: string }, type: 'text' | 'highlight') {
    setRecent(prev => {
      const list = prev[type].filter(c => c.css !== color.css)
      return {
        ...prev,
        [type]: [color, ...list].slice(0, MAX_RECENT)
      }
    })
  }

  return (
    <ColorContext.Provider
      value={{
        currentColor,
        currentHighlight,
        recent,
        addRecentColor,
        editor
      }}
    >
      {children}
    </ColorContext.Provider>
  )
}
