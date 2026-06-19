import { useCallback } from "react";
import type { Editor } from "@tiptap/react";
import type { Page } from "src/types";
import { DIFF_PLUGIN_KEY } from "./diff-extension";
import { computeDiff } from "./utils";
import type { DiffDecoration } from "./diff-extension";

// Default user color — swap for real user color from your auth context
const DEFAULT_USER_COLOR = "#7c3aed";

export function useDiff(editor: Editor | null) {
  const applyDiff = useCallback(
    (
      versionContent: Page["content"],
      currentContent: Page["content"],
      userColor = DEFAULT_USER_COLOR,
    ) => {
      if (!editor) return;

      const { added, removed } = computeDiff(versionContent, currentContent);

      const decorations: DiffDecoration[] = [
        ...added.map((r) => ({ ...r, color: userColor })),
        ...removed.map((r) => ({ ...r, color: userColor })),
      ];

      editor.view.dispatch(
        editor.state.tr.setMeta(DIFF_PLUGIN_KEY, decorations),
      );
    },
    [editor],
  );

  const clearDiff = useCallback(() => {
    if (!editor) return;
    editor.view.dispatch(editor.state.tr.setMeta(DIFF_PLUGIN_KEY, null));
  }, [editor]);

  return { applyDiff, clearDiff };
}
