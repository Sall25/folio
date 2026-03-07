import { forwardRef, useCallback, useMemo } from "react"

// --- Lib ---
import { parseShortcutKeys } from "@/lib/tiptap-utils"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

// --- Tiptap UI ---
import type { UseTextColorConfig } from "./use-text-color"
import {
  TEXT_COLOR_SHORTCUT_KEY,
  useTextColor,
} from "./use-text-color"

// --- UI Primitives ---
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button"
import { Button } from "@/components/tiptap-ui-primitive/button"
import { Badge } from "@/components/tiptap-ui-primitive/badge"

// --- Styles ---
import "@/components/tiptap-ui/text-color-button/text-color-button.scss"

export interface TextColorButtonProps
  extends Omit<ButtonProps, "type">,
  UseTextColorConfig {
  text?: string
  showShortcut?: boolean
}

export function TextColorShortcutBadge({
  shortcutKeys = TEXT_COLOR_SHORTCUT_KEY,
}: {
  shortcutKeys?: string
}) {
  return <Badge>{parseShortcutKeys({ shortcutKeys })}</Badge>
}

export const TextColorButton = forwardRef<
  HTMLButtonElement,
  TextColorButtonProps
>(
  (
    {
      editor: providedEditor,
      textColor,
      text,
      hideWhenUnavailable = false,
      onApplied,
      onClick,
      children,
      style,
      ...buttonProps
    },
    ref
  ) => {
    const { editor } = useTiptapEditor(providedEditor)
    const {
      isVisible,
      canTextColor,
      isActive,
      handleTextColor,
      label,
    } = useTextColor({
      editor,
      textColor,
      label: text || `Text color (${textColor})`,
      hideWhenUnavailable,
      onApplied,
    })

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        handleTextColor()
      },
      [handleTextColor, onClick]
    )

    const buttonStyle = useMemo(
      () =>
      ({
        ...style,
        color: textColor,
      } as React.CSSProperties),
      [textColor, style]
    )

    if (!isVisible) {
      return null
    }

    return (
      <Button
        type="button"
        variant="ghost"
        data-active-state={isActive ? "on" : "off"}
        role="button"
        tabIndex={-1}
        disabled={!canTextColor}
        data-disabled={!canTextColor}
        aria-label={label}
        aria-pressed={isActive}
        tooltip={label}
        onClick={handleClick}
        style={buttonStyle}
        {...buttonProps}
        ref={ref}
      >
        {children}
      </Button>
    )
  }
)

TextColorButton.displayName = "TextColorButton"
