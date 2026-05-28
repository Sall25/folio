import { useCallback } from "react";
import { usePages } from "src/components/tiptap-templates/simple/use-pages";
import { useCurrentEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { stripPropertyPanels } from "src/components/tiptap-templates/simple/hooks/use-record-property-panel";
import type { JSONContent, NodeViewProps } from "@tiptap/react";
import { findPage } from "src/lib/find-page";

/**
 * For regular cell node views (live in main editor).
 * Usage: syncPage(() => updateAttributes({ ...node.attrs, value: iso }), node)
 */
export function useCellPageSync(
  getPos: NodeViewProps["getPos"],
  updateAttributes: NodeViewProps["updateAttributes"],
) {
  const { pages, updatePageAsync } = usePages();
  const { editor } = useCurrentEditor();

  return useCallback(
    (onUpdate: () => void, currentNode: NodeViewProps["node"]) => {
      if (!editor || !pages) return;

      onUpdate();

      queueMicrotask(() => {
        let pageId: number | null = currentNode.attrs.pageId ?? null;

        if (pageId == null && getPos) {
          const pos = getPos();
          if (pos != null) {
            const $pos = editor.state.doc.resolve(pos);
            for (let d = $pos.depth; d > 0; d--) {
              const record = $pos.node(d);
              if (record.type.name !== "databaseRecord") continue;
              record.forEach((cell) => {
                if (
                  cell.type.name === "titleCell" &&
                  cell.attrs.pageId != null
                ) {
                  pageId = cell.attrs.pageId;
                  updateAttributes({ ...currentNode.attrs, pageId });
                }
              });
              break;
            }
          }
        }

        if (pageId == null) return;
        const page = findPage(pages, pageId);
        if (!page) return;

        updatePageAsync({
          ...page,
          updatedAt: Date.now().toString(),
        });
      });
    },
    [editor, pages, updatePageAsync, getPos, updateAttributes],
  );
}

/**
 * For RecordPropertyPanelView (dispatches on mainEditor, lives in peek editor).
 */
export function usePanelCellPageSync(
  mainEditor: Editor | null,
  pageId: number | null,
) {
  const { pages, updatePageAsync } = usePages();

  return useCallback(
    (onUpdate: () => void) => {
      if (!mainEditor || !pages || pageId == null) return;

      onUpdate();

      queueMicrotask(() => {
        const page = findPage(pages, pageId);
        if (!page) return;

        updatePageAsync({
          ...page,
          content: stripPropertyPanels(mainEditor.getJSON()) as JSONContent,
          updatedAt: Date.now().toString(),
        });
      });
    },
    [mainEditor, pages, updatePageAsync, pageId],
  );
}
