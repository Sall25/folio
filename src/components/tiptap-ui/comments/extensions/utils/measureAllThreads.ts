import type { Editor } from "@tiptap/core"
import type { MeasuredThread, Thread } from "../../types"

export function measureAllThreads(editor: Editor, threads: Thread[]): MeasuredThread[] {
  const scrollY = window.scrollY


  return threads
    .map(t => {
      const { top } = editor.view.coordsAtPos(t.anchor.from)

      const el = document.querySelector(
        `[data-thread-list-item-id="${t.id}"]`
      ) as HTMLElement | null

      const height = el?.offsetHeight ?? 150

      return {
        id: t.id,
        from: t.anchor.from,
        to: t.anchor.to,
        anchorTop: top + scrollY,
        height
      }
    })
}
