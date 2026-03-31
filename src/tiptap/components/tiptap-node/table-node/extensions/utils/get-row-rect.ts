import { EditorView } from "@tiptap/pm/view";

export function getRowRect(view: EditorView, rowStart: number) {
  const rowDOM = view.nodeDOM(rowStart) as HTMLElement | null;
  return rowDOM?.getBoundingClientRect() ?? null;
}
