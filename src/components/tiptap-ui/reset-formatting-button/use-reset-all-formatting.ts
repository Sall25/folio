import {
  useMemo,
  useEffect,
  useCallback
} from "react"
import { RotateCcw } from "lucide-react"
import {
  canResetFormatting,
  resetFormatting
} from "./utils"
import type { UseResetAllFormattingOptions, UseResetAllFormattingReturn } from "./types"

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useResetAllFormatting({
  editor,
  preserveMarks = ['inlineThread'],
  hideWhenUnavailable = false,
  onResetAllFormatting,
}: UseResetAllFormattingOptions): UseResetAllFormattingReturn {

  const canReset = useMemo(
    () => canResetFormatting(editor, preserveMarks),
    // Re-derive whenever editor state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor, editor?.state, preserveMarks]
  )

  const isVisible = hideWhenUnavailable ? canReset : true

  const handleResetFormatting = useCallback(() => {
    if (!canReset) return false
    const success = resetFormatting(editor, preserveMarks)
    if (success) onResetAllFormatting?.()
    return success
  }, [editor, canReset, preserveMarks, onResetAllFormatting])

  // Register Cmd/Ctrl + R shortcut (overrides browser refresh when focused)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'r' && editor?.isFocused) {
        e.preventDefault()
        handleResetFormatting()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [editor, handleResetFormatting])

  return {
    isVisible,
    canReset,
    handleResetFormatting,
    label: 'Reset formatting',
    shortcutKeys: '⌘R',
    Icon: RotateCcw,
  }
}