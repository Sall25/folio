"use client";

import { useCallback, useEffect, useState } from "react";
import { type Editor } from "@tiptap/react";
import { useHotkeys } from "react-hotkeys-hook";

// --- Hooks ---
import { useTiptapEditor } from "src/hooks/use-tiptap-editor";
import { useIsBreakpoint } from "src/hooks/use-is-breakpoint";

// --- Lib ---
import {
  isMarkInSchema,
  //isExtensionAvailable,
} from "src/lib/tiptap-utils";

// --- Icons ---
import { Paintbrush as TextIcon } from "lucide-react";

export const COLOR_TEXT_SHORTCUT_KEY = "mod+shift+t";
export const TEXT_COLORS = [
  {
    label: "Default color",
    value: "var(--tt-bg-color)",
    colorValue: "#ffffff",
    border: "var(--tt-bg-color-contrast)",
  },
  {
    label: "Gray color",
    value: "var(--tt-color-text-gray)",
    colorValue: "#f8f8f7",
    border: "var(--tt-color-text-gray-contrast)",
  },
  {
    label: "Brown color",
    value: "var(--tt-color-text-brown)",
    colorValue: "#f4eeee",
    border: "var(--tt-color-text-brown-contrast)",
  },
  {
    label: "Orange color",
    value: "var(--tt-color-text-orange)",
    colorValue: "#fbecdd",
    border: "var(--tt-color-text-orange-contrast)",
  },
  {
    label: "Yellow color",
    value: "var(--tt-color-text-yellow)",
    colorValue: "#fef9c3",
    border: "var(--tt-color-text-yellow-contrast)",
  },
  {
    label: "Green color",
    value: "var(--tt-color-text-green)",
    colorValue: "#dcfce7",
    border: "var(--tt-color-text-green-contrast)",
  },
  {
    label: "Blue color",
    value: "var(--tt-color-text-blue)",
    colorValue: "#e0f2fe",
    border: "var(--tt-color-text-blue-contrast)",
  },
  {
    label: "Purple color",
    value: "var(--tt-color-text-purple)",
    colorValue: "#f3e8ff",
    border: "var(--tt-color-text-purple-contrast)",
  },
  {
    label: "Pink color",
    value: "var(--tt-color-text-pink)",
    colorValue: "#fcf1f6",
    border: "var(--tt-color-text-pink-contrast)",
  },
  {
    label: "Red color",
    value: "var(--tt-color-text-red)",
    colorValue: "#ffe4e6",
    border: "var(--tt-color-text-red-contrast)",
  },
];
export type TextColor = (typeof TEXT_COLORS)[number];

export type TextMode = "mark" | "node";

/**
 * Configuration for the color text functionality
 */
export interface UseColorTextConfig {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor | null;
  /**
   * The color to apply when toggling the text.
   */
  textColor?: string;
  /**
   * Optional label to display alongside the icon.
   */
  label?: string;
  /**
   * Whether the button should hide when the mark is not available.
   * @default false
   */
  hideWhenUnavailable?: boolean;
  /**
   * The texting mode to use.
   * - "mark": Uses the text mark extension (default)
   * - "node": Uses the node background extension
   * @default "mark"
   */
  mode?: TextMode;
  /**
   * When true, uses the actual color value (colorValue) instead of CSS variable (value).
   * @default false
   */
  useColorValue?: boolean;
  /**
   * Called when the text is applied.
   */
  onApplied?: ({
    color,
    label,
    mode,
  }: {
    color: string;
    label: string;
    mode: TextMode;
  }) => void;
}

export function pickTextColorsByValue(values: string[]) {
  const colorMap = new Map(TEXT_COLORS.map((color) => [color.value, color]));
  return values
    .map((value) => colorMap.get(value))
    .filter((color): color is (typeof TEXT_COLORS)[number] => !!color);
}

/**
 * Gets the appropriate color value based on configuration
 */
export function getTextColorValue(
  color: string,
  useColorValue: boolean = false,
): string {
  if (!useColorValue) return color;

  const colorItem = TEXT_COLORS.find(
    (c) => c.value === color || c.colorValue === color,
  );
  return colorItem?.colorValue || color;
}

/**
 * Checks if text can be applied based on the mode and current editor state
 */
export function canColorText(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false;

  return true;
}

/**
 * Checks if text is currently active
 */
export function isColortextActive(
  editor: Editor | null,
  textColor?: string,
  mode: TextMode = "mark",
): boolean {
  if (!editor || !editor.isEditable) return false;

  if (mode === "mark") {
    return textColor
      ? editor.isActive("textStyle", { color: textColor })
      : editor.isActive("textStyle");
  } else {
    if (!textColor) return false;

    try {
      const { state } = editor;
      const { selection } = state;

      const $pos = selection.$anchor;
      for (let depth = $pos.depth; depth >= 0; depth--) {
        const node = $pos.node(depth);
        if (node && node.attrs?.color === textColor) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }
}

/**
 * Removes text based on the mode
 */
export function removeText(
  editor: Editor | null,
  mode: TextMode = "mark",
): boolean {
  if (!editor || !editor.isEditable) return false;
  if (!canColorText(editor, mode)) return false;

  if (mode === "mark") {
    return editor
      .chain()
      .focus()
      .updateAttributes("textStyle", { color: null })
      .run();
  }

  return editor.chain().focus().unsetNodeColor().run();
}

/**
 * Determines if the text button should be shown
 */
export function shouldShowButton(props: {
  editor: Editor | null;
  hideWhenUnavailable: boolean;
  mode: TextMode;
}): boolean {
  const { editor, hideWhenUnavailable, mode } = props;

  if (!editor || !editor.isEditable) return false;

  if (!hideWhenUnavailable) {
    return true;
  }

  // hideWhenUnavailable=true: check schema/extension availability
  if (mode === "mark") {
    if (!isMarkInSchema("textStyle", editor)) return false;
  }
  //  else {
  //   if (!isExtensionAvailable(editor, ["nodeBackground"])) return false
  // }

  if (!editor.isActive("code")) {
    return canColorText(editor, mode);
  }

  return true;
}

export function useColorText(config: UseColorTextConfig) {
  const {
    editor: providedEditor,
    label,
    textColor,
    hideWhenUnavailable = false,
    mode = "mark",
    useColorValue = false,
    onApplied,
  } = config;

  const { editor } = useTiptapEditor(providedEditor);
  const isMobile = useIsBreakpoint();
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const canColortextState = canColorText(editor, mode);
  const actualColor = textColor
    ? getTextColorValue(textColor, useColorValue)
    : textColor;
  const isActive = isColortextActive(editor, actualColor, mode);

  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      setIsVisible(shouldShowButton({ editor, hideWhenUnavailable, mode }));
    };

    handleSelectionUpdate();

    editor.on("selectionUpdate", handleSelectionUpdate);

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor, hideWhenUnavailable, mode]);

  const handleColorText = useCallback(() => {
    const canApply = canColorText(editor, mode);
    if (!editor || !canApply || !actualColor || !label) return false;

    const success = editor
      .chain()
      .focus()
      .toggleTextStyle({ color: actualColor })
      .run();
    if (success) {
      onApplied?.({ color: actualColor, label, mode });
    }
    return success;

    // if (mode === "mark") {
    //   if (editor.state.storedMarks) {
    //     const textMarkType = editor.schema.marks.textStyle;
    //     if (textMarkType) {
    //       editor.view.dispatch(editor.state.tr.removeStoredMark(textMarkType));
    //     }
    //   }

    //   setTimeout(() => {
    //     const success = editor
    //       .chain()
    //       .focus()
    //       .toggleTextStyle({ color: actualColor })
    //       .run();
    //     if (success) {

    //     }
    //     return success;
    //   }, 0);

    //   return true;
    // } else {
    //   const success = editor
    //     .chain()
    //     .focus()
    //     .toggleNodeBackgroundColor(actualColor)
    //     .run();

    //   if (success) {
    //     onApplied?.({ color: actualColor, label, mode });
    //   }
    //   return success;
    // }
  }, [actualColor, editor, label, onApplied, mode]);

  const handleRemovetext = useCallback(() => {
    const success = removeText(editor, mode);
    if (success) {
      onApplied?.({ color: "", label: "Remove text", mode });
    }
    return success;
  }, [editor, onApplied, mode]);

  useHotkeys(
    COLOR_TEXT_SHORTCUT_KEY,
    (event) => {
      event.preventDefault();
      handleColorText();
    },
    {
      enabled: isVisible && canColortextState,
      enableOnContentEditable: !isMobile,
      enableOnFormTags: true,
    },
  );

  return {
    isVisible,
    isActive,
    handleColorText,
    handleRemovetext,
    canColortext: canColortextState,
    label: label || `text`,
    shortcutKeys: COLOR_TEXT_SHORTCUT_KEY,
    Icon: TextIcon,
    mode,
  };
}
