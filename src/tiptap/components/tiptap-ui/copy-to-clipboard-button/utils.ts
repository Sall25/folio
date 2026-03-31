import { Editor } from '@tiptap/react'
import { getHTMLFromFragment } from '@tiptap/core'

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Write plain text (and optional HTML) to the system clipboard. */
export async function writeToClipboard(
  textContent: string,
  htmlContent?: string
): Promise<boolean> {
  try {
    if (htmlContent && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([textContent], { type: 'text/plain' }),
          'text/html': new Blob([htmlContent], { type: 'text/html' }),
        }),
      ])
    } else {
      await navigator.clipboard.writeText(textContent)
    }
    return true
  } catch {
    // Fallback for older browsers
    try {
      const ta = document.createElement('textarea')
      ta.value = textContent
      ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      return true
    } catch {
      return false
    }
  }
}

/** Extract text and HTML content from the current editor selection or full doc. */
export function extractContent(
  editor: Editor,
  copyWithFormatting = true
): { textContent: string; htmlContent: string } {
  const { state } = editor
  const { from, to, empty } = state.selection

  if (empty) {
    // Nothing selected — copy the entire document
    const textContent = state.doc.textContent
    const htmlContent = copyWithFormatting
      ? getHTMLFromFragment(state.doc.content, editor.schema)
      : textContent
    return { textContent, htmlContent }
  }

  const textContent = state.doc.textBetween(from, to, '\n')
  const htmlContent = copyWithFormatting
    ? getHTMLFromFragment(state.selection.content().content, editor.schema)
    : textContent

  return { textContent, htmlContent }
}

/** Check if the editor is in a state where copying is meaningful. */
export function canCopyToClipboard(editor: Editor | null): boolean {
  if (!editor || editor.isDestroyed) return false
  return true
}

/** Programmatically copy editor content to clipboard. */
export async function copyToClipboard(
  editor: Editor | null,
  copyWithFormatting = true
): Promise<boolean> {
  if (!canCopyToClipboard(editor)) return false
  const { textContent, htmlContent } = extractContent(editor!, copyWithFormatting)
  return writeToClipboard(textContent, copyWithFormatting ? htmlContent : undefined)
}