"use client";

import { useCallback, useEffect, useState } from "react";
import { type Editor } from "@tiptap/react";
import { useHotkeys } from "react-hotkeys-hook";
import { useTranslation } from "react-i18next";

// --- Hooks ---
import { useTiptapEditor } from "src/hooks/use-tiptap-editor";
import { useIsBreakpoint } from "src/hooks/use-is-breakpoint";

// --- Lib ---
import {
  isMarkInSchema,
  isNodeTypeSelected,
  isExtensionAvailable,
} from "src/lib/tiptap-utils";

// --- Icons ---
import { HighlighterIcon } from "src/components/tiptap-icons/highlighter-icon";

export const COLOR_HIGHLIGHT_SHORTCUT_KEY = "mod+shift+h";
export const HIGHLIGHT_COLORS = [
  {
    label: "Default background",
    labelKey: "colors.highlights.default",
    value: "var(--tt-bg-color)",
    colorValue: "#ffffff",
    border: "var(--tt-bg-color-contrast)",
  },
  {
    label: "Gray background",
    labelKey: "colors.highlights.gray",
    value: "var(--tt-color-highlight-gray)",
    colorValue: "#f8f8f7",
    border: "var(--tt-color-highlight-gray-contrast)",
  },
  {
    label: "Brown background",
    labelKey: "colors.highlights.brown",
    value: "var(--tt-color-highlight-brown)",
    colorValue: "#f4eeee",
    border: "var(--tt-color-highlight-brown-contrast)",
  },
  {
    label: "Orange background",
    labelKey: "colors.highlights.orange",
    value: "var(--tt-color-highlight-orange)",
    colorValue: "#fbecdd",
    border: "var(--tt-color-highlight-orange-contrast)",
  },
  {
    label: "Yellow background",
    labelKey: "colors.highlights.yellow",
    value: "var(--tt-color-highlight-yellow)",
    colorValue: "#fef9c3",
    border: "var(--tt-color-highlight-yellow-contrast)",
  },
  {
    label: "Lime background",
    labelKey: "colors.highlights.lime",
    value: "var(--tt-color-highlight-lime)",
    colorValue: "#ecfccb",
    border: "var(--tt-color-highlight-lime-contrast)",
  },
  {
    label: "Green background",
    labelKey: "colors.highlights.green",
    value: "var(--tt-color-highlight-green)",
    colorValue: "#dcfce7",
    border: "var(--tt-color-highlight-green-contrast)",
  },
  {
    label: "Mint background",
    labelKey: "colors.highlights.mint",
    value: "var(--tt-color-highlight-mint)",
    colorValue: "#d1faec",
    border: "var(--tt-color-highlight-mint-contrast)",
  },
  {
    label: "Teal background",
    labelKey: "colors.highlights.teal",
    value: "var(--tt-color-highlight-teal)",
    colorValue: "#cdf3f0",
    border: "var(--tt-color-highlight-teal-contrast)",
  },
  {
    label: "Cyan background",
    labelKey: "colors.highlights.cyan",
    value: "var(--tt-color-highlight-cyan)",
    colorValue: "#d7f0fa",
    border: "var(--tt-color-highlight-cyan-contrast)",
  },
  {
    label: "Blue background",
    labelKey: "colors.highlights.blue",
    value: "var(--tt-color-highlight-blue)",
    colorValue: "#e0f2fe",
    border: "var(--tt-color-highlight-blue-contrast)",
  },
  {
    label: "Slate background",
    labelKey: "colors.highlights.slate",
    value: "var(--tt-color-highlight-slate)",
    colorValue: "#e7ebf0",
    border: "var(--tt-color-highlight-slate-contrast)",
  },
  {
    label: "Indigo background",
    labelKey: "colors.highlights.indigo",
    value: "var(--tt-color-highlight-indigo)",
    colorValue: "#e6e7fb",
    border: "var(--tt-color-highlight-indigo-contrast)",
  },
  {
    label: "Purple background",
    labelKey: "colors.highlights.purple",
    value: "var(--tt-color-highlight-purple)",
    colorValue: "#f3e8ff",
    border: "var(--tt-color-highlight-purple-contrast)",
  },
  {
    label: "Violet background",
    labelKey: "colors.highlights.violet",
    value: "var(--tt-color-highlight-violet)",
    colorValue: "#eee6fb",
    border: "var(--tt-color-highlight-violet-contrast)",
  },
  {
    label: "Magenta background",
    labelKey: "colors.highlights.magenta",
    value: "var(--tt-color-highlight-magenta)",
    colorValue: "#f9e4f7",
    border: "var(--tt-color-highlight-magenta-contrast)",
  },
  {
    label: "Pink background",
    labelKey: "colors.highlights.pink",
    value: "var(--tt-color-highlight-pink)",
    colorValue: "#fcf1f6",
    border: "var(--tt-color-highlight-pink-contrast)",
  },
  {
    label: "Rose background",
    labelKey: "colors.highlights.rose",
    value: "var(--tt-color-highlight-rose)",
    colorValue: "#ffe4ec",
    border: "var(--tt-color-highlight-rose-contrast)",
  },
  {
    label: "Red background",
    labelKey: "colors.highlights.red",
    value: "var(--tt-color-highlight-red)",
    colorValue: "#ffe4e6",
    border: "var(--tt-color-highlight-red-contrast)",
  },
];
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

export type HighlightMode = "mark" | "node";

/**
 * Configuration for the color highlight functionality
 */
export interface UseColorHighlightConfig {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor | null;
  /**
   * The color to apply when toggling the highlight.
   */
  highlightColor?: string;
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
   * The highlighting mode to use.
   * - "mark": Uses the highlight mark extension (default)
   * - "node": Uses the node background extension
   * @default "mark"
   */
  mode?: HighlightMode;
  /**
   * When true, uses the actual color value (colorValue) instead of CSS variable (value).
   * @default false
   */
  useColorValue?: boolean;
  /**
   * Called when the highlight is applied.
   */
  onApplied?: ({
    color,
    label,
    mode,
  }: {
    color: string;
    label: string;
    mode: HighlightMode;
  }) => void;
}

export function pickHighlightColorsByValue(values: string[]) {
  const colorMap = new Map(
    HIGHLIGHT_COLORS.map((color) => [color.value, color]),
  );
  return values
    .map((value) => colorMap.get(value))
    .filter((color): color is (typeof HIGHLIGHT_COLORS)[number] => !!color);
}

/**
 * Gets the appropriate color value based on configuration
 */
export function getHighlightColorValue(
  color: string,
  useColorValue: boolean = false,
): string {
  if (!useColorValue) return color;

  const colorItem = HIGHLIGHT_COLORS.find(
    (c) => c.value === color || c.colorValue === color,
  );
  return colorItem?.colorValue || color;
}

/**
 * Checks if highlight can be applied based on the mode and current editor state
 */
export function canColorHighlight(
  editor: Editor | null,
  mode: HighlightMode = "mark",
): boolean {
  if (!editor || !editor.isEditable) return false;

  if (mode === "mark") {
    if (
      !isMarkInSchema("highlight", editor) ||
      isNodeTypeSelected(editor, ["image"])
    )
      return false;

    return editor.can().setMark("highlight");
  } else {
    if (!isExtensionAvailable(editor, ["nodeBackground"])) return false;

    try {
      return editor.can().toggleNodeBackgroundColor("test");
    } catch {
      return false;
    }
  }
}

/**
 * Checks if highlight is currently active
 */
export function isColorHighlightActive(
  editor: Editor | null,
  highlightColor?: string,
  mode: HighlightMode = "mark",
): boolean {
  if (!editor || !editor.isEditable) return false;

  if (mode === "mark") {
    return highlightColor
      ? editor.isActive("highlight", { color: highlightColor })
      : editor.isActive("highlight");
  } else {
    if (!highlightColor) return false;

    try {
      const { state } = editor;
      const { selection } = state;

      const $pos = selection.$anchor;
      for (let depth = $pos.depth; depth >= 0; depth--) {
        const node = $pos.node(depth);
        if (node && node.attrs?.backgroundColor === highlightColor) {
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
 * Removes highlight based on the mode
 */
export function removeHighlight(
  editor: Editor | null,
  mode: HighlightMode = "mark",
): boolean {
  if (!editor || !editor.isEditable) return false;
  if (!canColorHighlight(editor, mode)) return false;

  if (mode === "mark") {
    return editor.chain().focus().unsetMark("highlight").run();
  } else {
    return editor.chain().focus().unsetNodeBackgroundColor().run();
  }
}

/**
 * Determines if the highlight button should be shown
 */
export function shouldShowButton(props: {
  editor: Editor | null;
  hideWhenUnavailable: boolean;
  mode: HighlightMode;
}): boolean {
  const { editor, hideWhenUnavailable, mode } = props;

  if (!editor || !editor.isEditable) return false;

  if (!hideWhenUnavailable) {
    return true;
  }

  // hideWhenUnavailable=true: check schema/extension availability
  if (mode === "mark") {
    if (!isMarkInSchema("highlight", editor)) return false;
  } else {
    if (!isExtensionAvailable(editor, ["nodeBackground"])) return false;
  }

  if (!editor.isActive("code")) {
    return canColorHighlight(editor, mode);
  }

  return true;
}

export function useColorHighlight(config: UseColorHighlightConfig) {
  const {
    editor: providedEditor,
    label,
    highlightColor,
    hideWhenUnavailable = false,
    mode = "mark",
    useColorValue = false,
    onApplied,
  } = config;

  const { t } = useTranslation();
  const { editor } = useTiptapEditor(providedEditor);
  const isMobile = useIsBreakpoint();
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const canColorHighlightState = canColorHighlight(editor, mode);
  const actualColor = highlightColor
    ? getHighlightColorValue(highlightColor, useColorValue)
    : highlightColor;
  const isActive = isColorHighlightActive(editor, actualColor, mode);

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

  const handleColorHighlight = useCallback(() => {
    if (!editor || !canColorHighlightState || !actualColor || !label)
      return false;

    if (mode === "mark") {
      if (editor.state.storedMarks) {
        const highlightMarkType = editor.schema.marks.highlight;
        if (highlightMarkType) {
          editor.view.dispatch(
            editor.state.tr.removeStoredMark(highlightMarkType),
          );
        }
      }

      setTimeout(() => {
        const success = editor
          .chain()
          .focus()
          .toggleHighlight({ color: actualColor })
          .run();

        if (success) {
          onApplied?.({ color: actualColor, label, mode });
        }
        return success;
      }, 0);

      return true;
    } else {
      const success = editor
        .chain()
        .focus()
        .toggleNodeBackgroundColor(actualColor)
        .run();

      if (success) {
        onApplied?.({ color: actualColor, label, mode });
      }
      return success;
    }
  }, [canColorHighlightState, actualColor, editor, label, onApplied, mode]);

  const handleRemoveHighlight = useCallback(() => {
    const success = removeHighlight(editor, mode);
    if (success) {
      onApplied?.({ color: "", label: t("colors.removeHighlight"), mode });
    }
    return success;
  }, [editor, onApplied, mode, t]);

  useHotkeys(
    COLOR_HIGHLIGHT_SHORTCUT_KEY,
    (event) => {
      event.preventDefault();
      handleColorHighlight();
    },
    {
      enabled: isVisible && canColorHighlightState,
      enableOnContentEditable: !isMobile,
      enableOnFormTags: true,
    },
  );

  return {
    isVisible,
    isActive,
    handleColorHighlight,
    handleRemoveHighlight,
    canColorHighlight: canColorHighlightState,
    label: label || t("colors.highlight"),
    shortcutKeys: COLOR_HIGHLIGHT_SHORTCUT_KEY,
    Icon: HighlighterIcon,
    mode,
  };
}
