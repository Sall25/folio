import { EditorView } from "@tiptap/pm/view";
import { Node as PMNode } from "@tiptap/pm/model";

export function getHeaderCellRect(
  view: EditorView,
  tableNode: PMNode,
  tablePos: number,
  columnIndex: number,
) {
  const firstRow = tableNode.firstChild;
  if (!firstRow) return null;

  let col = 0;
  let headerCellPos: number | null = null;

  for (let i = 0; i < firstRow.childCount; i++) {
    const cellNode = firstRow.child(i);
    const colspan = cellNode.attrs.colspan || 1;

    if (columnIndex >= col && columnIndex < col + colspan) {
      const rowStart = tablePos + 1;
      let offset = 0;
      for (let j = 0; j < i; j++) {
        offset += firstRow.child(j).nodeSize;
      }
      headerCellPos = rowStart + 1 + offset;
      break;
    }
    col += colspan;
  }

  if (headerCellPos == null) return null;

  const dom = view.nodeDOM(headerCellPos) as HTMLElement | null;
  return dom?.getBoundingClientRect() ?? null;
}
