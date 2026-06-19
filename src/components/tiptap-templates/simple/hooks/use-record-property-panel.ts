import { useEffect } from "react";
import type { Editor } from "@tiptap/react";
import type { Page } from "src/types";

export function stripPropertyPanels(content: unknown): unknown {
  if (!content || typeof content !== "object") return content;
  const node = content as { type?: string; content?: unknown[] };
  if (node.type === "recordPropertyPanel") return null;
  if (Array.isArray(node.content)) {
    return {
      ...node,
      content: node.content.map(stripPropertyPanels).filter(Boolean),
    };
  }
  return node;
}

export function useRecordPropertyPanel(
  editor: Editor | null,
  page: Page | null,
) {
  useEffect(() => {
    if (!editor || !page) return;

    const isRow = page.sourceId != null;
    const secondNode =
      editor.state.doc.childCount > 1 ? editor.state.doc.child(1) : null;
    const hasPanel = secondNode?.type.name === "recordPropertyPanel";

    if (isRow && !hasPanel) {
      // insert after title
      const titleNode = editor.state.doc.firstChild;
      if (!titleNode || titleNode.type.name !== "title") return;
      const panelType = editor.schema.nodes.recordPropertyPanel;
      if (!panelType) return;
      editor.view.dispatch(
        editor.state.tr.insert(
          titleNode.nodeSize,
          panelType.create({ pageId: page.id }),
        ),
      );
    } else if (!isRow && hasPanel) {
      // page is NOT a row but a stale panel is present → remove it
      const pos = editor.state.doc.firstChild!.nodeSize;
      editor.view.dispatch(
        editor.state.tr.delete(pos, pos + secondNode!.nodeSize),
      );
    }
  }, [editor, page]);
}
