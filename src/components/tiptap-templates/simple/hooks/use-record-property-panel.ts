import { useEffect } from "react";
import type { Editor } from "@tiptap/react";
import type { Page } from "src/components/tiptap-templates/simple/types";
import { findPage } from "src/lib/find-page";

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
  pages: Page[] | undefined,
  pageId: number | null | undefined,
) {
  useEffect(() => {
    if (!editor || pageId == null || !pages) return;
    if (!Array.isArray(pages) || pages.length === 0) return;
    // The record's page carries its source + record ids (stamped at creation)
    const page = findPage(pages, pageId);
    const sourceId = page?.databaseId ?? null;
    const recordId = page?.recordId ?? null;
    if (!sourceId || !recordId) return;

    // Already inserted?
    const secondNode =
      editor.state.doc.childCount > 1 ? editor.state.doc.child(1) : null;
    if (secondNode?.type.name === "recordPropertyPanel") return;

    const titleNode = editor.state.doc.firstChild;
    if (!titleNode || titleNode.type.name !== "title") return;

    const panelType = editor.schema.nodes.recordPropertyPanel;
    if (!panelType) return;

    editor.view.dispatch(
      editor.state.tr.insert(
        titleNode.nodeSize,
        panelType.create({ pageId, sourceId, recordId }),
      ),
    );
  }, [editor, pages, pageId]);
}
