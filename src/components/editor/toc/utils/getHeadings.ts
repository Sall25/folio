import { Editor } from '@tiptap/react'
import type { HeadingType } from '../types'

export default function getHeadings(editor: Editor): HeadingType[] {
  const headings: HeadingType[] = []

  // Collect headings with actual node positions
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      headings.push({
        id: node.attrs.id,
        title: node.textContent,
        level: node.attrs.level,
        from: pos,
        to: pos + node.nodeSize // real end of node
      })
    }
  })

  // Optional: extend each heading to the start of the next heading
  for (let i = 0; i < headings.length; i++) {
    const current = headings[i]
    const next = headings[i + 1]
    // Use next.from - 1 to include blank lines between headings
    current.to = next ? next.from - 1 : editor.state.doc.nodeSize
  }

  return headings
}
