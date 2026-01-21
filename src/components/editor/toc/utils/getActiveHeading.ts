import { Editor } from "@tiptap/react"
import getHeadings from "./getHeadings"
import { type HeadingType } from "../types"

export default function getActiveHeading(editor: Editor): HeadingType | undefined {
  const headings = getHeadings(editor)
  const pos = editor.state.selection.$from.pos

  // Find the heading where the cursor is inside its range
  return headings.find(h => pos >= h.from && pos <= h.to)
}
