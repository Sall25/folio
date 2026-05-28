import { useEffect } from "react";
import type { Editor } from "@tiptap/react";

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

const mainEditorMap = new WeakMap<Editor, Editor>();

export function getMainEditor(peekEditor: Editor): Editor | null {
  return mainEditorMap.get(peekEditor) ?? null;
}

export function useRecordPropertyPanel(
  editor: Editor | null,
  mainEditor: Editor | null,
  pageId: number | null | undefined,
) {
  useEffect(() => {
    if (!editor || !mainEditor || pageId == null) return;

    // Resolve databaseId, recordId, parentId from mainEditor doc
    let databaseId: string | null = null;
    let recordId: string | null = null;
    let parentId: number | null = null;

    mainEditor.state.doc.descendants((node, pos) => {
      if (databaseId && recordId) return false;
      if (node.type.name !== "titleCell") return;
      if (node.attrs.pageId !== pageId) return;

      parentId = node.attrs.parentId ?? null;

      const $pos = mainEditor.state.doc.resolve(pos);
      for (let d = $pos.depth; d > 0; d--) {
        const ancestor = $pos.node(d);
        if (ancestor.type.name === "databaseRecord" && !recordId)
          recordId = ancestor.attrs.id;
        if (ancestor.type.name === "database" && !databaseId)
          databaseId = ancestor.attrs.id;
        if (recordId && databaseId) break;
      }
      return false;
    });

    if (!databaseId || !recordId) return;

    // Store mainEditor in WeakMap BEFORE inserting the node
    mainEditorMap.set(editor, mainEditor);

    // Check if panel already exists
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
        panelType.create({ pageId, databaseId, recordId, parentId }),
      ),
    );
  }, [editor, mainEditor, pageId]);
}
