"use client"

import { useCallback, useEffect, useState } from "react"
import { type Editor } from "@tiptap/react"
import { useHotkeys } from "react-hotkeys-hook"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint"

// --- Lib ---
import {
  isExtensionAvailable,
} from "@/lib/tiptap-utils"

// --- Icons ---
import { TextColorIcon } from "@/components/tiptap-icons/text-color-icon"

export const TEXT_COLOR_SHORTCUT_KEY = "mod+shift+c"

export interface UseTextColorConfig {
  editor?: Editor | null
  /** desired text color (css string) */
  textColor?: string
  /** label for accessibility/tooltip */
  label?: string
  /** hide button when functionality is not available */
  hideWhenUnavailable?: boolean
  /** callback invoked when color is applied or removed */
  onApplied?: (params: { color: string; label: string }) => void
}

function canTextColor(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false
  if (!isExtensionAvailable(editor, ["textStyle"])) return false

  try {
    return editor.can().toggleTextStyle({ color: "#000" })
  } catch {
    return false
  }
}

function isTextColorActive(
  editor: Editor | null,
  textColor?: string
): boolean {
  if (!editor || !editor.isEditable) return false
  if (textColor) {
    return editor.isActive("textStyle", { color: textColor })
  }
  // any color active?
  const attr = editor.getAttributes("textStyle")
  return Boolean(attr.color)
}

export function useTextColor(config: UseTextColorConfig) {
  const {
    editor: providedEditor,
    label,
    textColor,
    hideWhenUnavailable = false,
    onApplied,
  } = config

  const { editor } = useTiptapEditor(providedEditor)
  const isMobile = useIsBreakpoint()
  const [isVisible, setIsVisible] = useState(true)

  const canColorState = canTextColor(editor)
  const actualColor = textColor
  const isActive = isTextColorActive(editor, actualColor)

  useEffect(() => {
    if (!editor) return

    const update = () => {
      if (!editor || !editor.isEditable) {
        setIsVisible(false)
        return
      }
      if (!hideWhenUnavailable) {
        setIsVisible(true)
        return
      }
      setIsVisible(canTextColor(editor))
    }

    update()
    editor.on("selectionUpdate", update)
    return () => {
      editor.off("selectionUpdate", update)
    }
  }, [editor, hideWhenUnavailable])

  const handleTextColor = useCallback(() => {
    if (!editor || !canColorState || !actualColor || !label) return false

    // toggle the style
    const success = editor
      .chain()
      .focus()
      .toggleTextStyle({ color: actualColor })
      .run()
    if (success) {
      onApplied?.({ color: actualColor, label })
    }
    return success
  }, [canColorState, actualColor, editor, label, onApplied])

  useHotkeys(
    TEXT_COLOR_SHORTCUT_KEY,
    (ev) => {
      ev.preventDefault()
      handleTextColor()
    },
    {
      enabled: isVisible && canColorState,
      enableOnContentEditable: !isMobile,
      enableOnFormTags: true,
    }
  )

  return {
    isVisible,
    isActive,
    handleTextColor,
    canTextColor: canColorState,
    label: label || `Text color`,
    shortcutKeys: TEXT_COLOR_SHORTCUT_KEY,
    Icon: TextColorIcon,
  }
}
