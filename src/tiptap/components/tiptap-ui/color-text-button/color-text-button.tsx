import { forwardRef, useCallback, useMemo } from "react"

// --- Lib ---
import { parseShortcutKeys } from "@/lib/tiptap-utils"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

// --- Tiptap UI ---
import type { UseColorTextConfig } from "./use-color-text"
import { COLOR_TEXT_SHORTCUT_KEY, useColorText } from "./use-color-text"

// --- UI Primitives ---
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button"
import { Button } from "@/components/tiptap-ui-primitive/button"
import { Badge } from "@/components/tiptap-ui-primitive/badge"

// --- Styles ---
import "./color-text-button.scss"

export interface ColortextButtonProps
  extends Omit<ButtonProps, "type">, UseColorTextConfig {
  /**
   * Optional text to display alongside the icon.
   */
  text?: string
  /**
   * Optional show shortcut keys in the button.
   * @default false
   */
  showShortcut?: boolean
}

export function ColorTextShortcutBadge({
  shortcutKeys = COLOR_TEXT_SHORTCUT_KEY,
}: {
  shortcutKeys?: string
}) {
  return <Badge>{parseShortcutKeys({ shortcutKeys })}</Badge>
}

/**
 * Button component for applying color texts in a Tiptap editor.
 *
 * Supports two texting modes:
 * - "mark": Uses the text mark extension (default)
 * - "node": Uses the node background extension
 *
 * For custom button implementations, use the `useColortext` hook instead.
 *
 * @example
 * ```tsx
 * // Mark-based texting (default)
 * <ColorTextButton textColor="yellow" />
 *
 * // Node-based background coloring
 * <ColorTextButton
 *   textColor="var(--tt-color-text-blue)"
 *   mode="node"
 * />
 *
 * // With custom callback
 * <ColorTextButton
 *   textColor="red"
 *   mode="mark"
 *   onApplied={({ color, mode }) => console.log(`Applied ${color} in ${mode} mode`)}
 * />
 * ```
 */
export const ColorTextButton = forwardRef<
  HTMLButtonElement,
  ColortextButtonProps
>(
  (
    {
      editor: providedEditor,
      textColor,
      text,
      hideWhenUnavailable = false,
      mode = "mark",
      onApplied,
      showShortcut = false,
      showTooltip = true,
      onClick,
      children,
      style,
      useColorValue = false,
      ...buttonProps
    },
    ref
  ) => {
    const { editor } = useTiptapEditor(providedEditor)
    const {
      isVisible,
      canColortext,
      isActive,
      handleColorText,
      label,
      shortcutKeys,
    } = useColorText({
      editor,
      textColor,
      useColorValue,
      label: text || `Toggle text (${textColor})`,
      hideWhenUnavailable,
      mode,
      onApplied,
    })

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        handleColorText()
      },
      [handleColorText, onClick]
    )

    const buttonStyle = useMemo(
      () =>
        ({
          ...style,
          "--text-color": textColor,
        }) as React.CSSProperties,
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
        tabIndex={-1}
        disabled={!canColortext}
        data-disabled={!canColortext}
        aria-label={label}
        aria-pressed={isActive}
        tooltip={showTooltip ? label : undefined}
        onClick={handleClick}
        style={buttonStyle}
        {...buttonProps}
        ref={ref}
        className="color-text-button"

      >
        {children ?? (
          <>
            <span
              className="color-text-icon"
              //  className="tiptap-button-icon"
              style={
                { "--text-color": textColor } as React.CSSProperties
              }
            >
              A
            </span>
            {text && <span className="color-text-label">{text}</span>}
            {showShortcut && (
              <ColorTextShortcutBadge shortcutKeys={shortcutKeys} />
            )}
          </>
        )}
      </Button>
    )
  }
)

ColorTextButton.displayName = "ColorTextButton"
