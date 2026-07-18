import type { Editor } from "@tiptap/core";

/**
 * Remove databaseRecord nodes from the document. The counterpart to
 * insertRecordNode in use-database-seed.ts.
 *
 * Deleting the page alone leaves orphaned record nodes in the doc, so a record
 * delete is always two operations: the page (data) and the node (document).
 */
export function removeRecordNodes(
  editor: Editor,
  databaseId: string,
  recordIds: string[],
) {
  const ids = new Set(recordIds);
  const ranges: { from: number; to: number }[] = [];

  editor.state.doc.descendants((node, pos) => {
    if (
      node.type.name === "databaseRecord" &&
      node.attrs.databaseId === databaseId &&
      ids.has(node.attrs.recordId as string)
    ) {
      ranges.push({ from: pos, to: pos + node.nodeSize });
      return false; // no need to descend into cells
    }
    return true;
  });

  if (ranges.length === 0) return;

  const tr = editor.state.tr;
  // Back-to-front: deleting an earlier range would shift every later position.
  ranges
    .sort((a, b) => b.from - a.from)
    .forEach(({ from, to }) => tr.delete(from, to));

  editor.view.dispatch(tr);
}
