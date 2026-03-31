import { Editor } from '@tiptap/react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseResetAllFormattingOptions {
  editor: Editor | null
  preserveMarks?: string[]
  hideWhenUnavailable?: boolean
  onResetAllFormatting?: () => void
}

export interface UseResetAllFormattingReturn {
  isVisible: boolean
  canReset: boolean
  handleResetFormatting: () => boolean
  label: string
  shortcutKeys: string
  Icon: React.FC<{ size?: number; className?: string }>
}