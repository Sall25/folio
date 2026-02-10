/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react"
import { Editor } from "@tiptap/react"

type FloatingCell = {
  cellNode: any
  cellPos: number
  domRect: DOMRect
}

export function useFocusedCell(editor: Editor) {
  const [focusedCell, setFocusedCell] = useState<FloatingCell | null>(null)

  useEffect(() => {
    if (!editor) return

    const handleSelectionUpdate = () => {
      const { state, view } = editor
      const { $from } = state.selection

      for (let d = $from.depth; d > 0; d--) {
        const node = $from.node(d)
        if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
          const pos = $from.before(d)
          const dom = view.nodeDOM(pos) as HTMLElement | null
          if (!dom) return setFocusedCell(null)

          setFocusedCell({
            cellNode: node,
            cellPos: pos,
            domRect: dom.getBoundingClientRect(),
          })
          return
        }
      }

      // Cursor left table
      setFocusedCell(null)
    }

    editor.on("selectionUpdate", handleSelectionUpdate)

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate)
    }
  }, [editor])

  return focusedCell
}
