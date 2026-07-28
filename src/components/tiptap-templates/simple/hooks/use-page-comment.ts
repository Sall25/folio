import { useEffect } from "react";
import type { Editor } from "@tiptap/react";
import type { Page } from "src/types";

// Strip page-comment nodes from stored content (they're inserted at runtime,
// like the record property panel — never persisted into the doc JSON).
export function stripPageComments(content: unknown): unknown {
  if (!content || typeof content !== "object") return content;
  const node = content as { type?: string; content?: unknown[] };
  if (node.type === "pageComment") return null;
  if (Array.isArray(node.content)) {
    return {
      ...node,
      content: node.content.map(stripPageComments).filter(Boolean),
    };
  }
  return node;
}

// Insert the page-comment node after editor creation, mirroring
// useRecordPropertyPanel. Ordering: title → [record property panel] → page comment.
export function usePageComment(editor: Editor | null, page: Page | null) {
  useEffect(() => {
    if (!editor || !page) return;

    const doc = editor.state.doc;

    let hasComment = false;
    doc.descendants((n) => {
      if (n.type.name === "pageComment") hasComment = true;
    });
    if (hasComment) return;

    const titleNode = doc.firstChild;
    if (!titleNode || titleNode.type.name !== "title") return;

    const commentType = editor.schema.nodes.pageComment;
    if (!commentType) return;

    // After the title, or after the record property panel if this is a row.
    let insertPos = titleNode.nodeSize;
    const second = doc.childCount > 1 ? doc.child(1) : null;
    if (second?.type.name === "recordPropertyPanel") {
      insertPos = titleNode.nodeSize + second.nodeSize;
    }

    editor.view.dispatch(
      editor.state.tr.insert(
        insertPos,
        commentType.create({ pageId: page.id }),
      ),
    );
  }, [editor, page]);
}
