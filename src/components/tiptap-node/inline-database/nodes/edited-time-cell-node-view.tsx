import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useCallback, useMemo } from "react";
import { usePages } from "src/components/tiptap-templates/simple/use-pages";
import { findPage } from "src/lib/find-page";

export function EditedTimeCellNodeView({ getPos, editor }: NodeViewProps) {
  const { pages } = usePages();

  const getParentRecord = useCallback(() => {
    const pos = getPos?.();
    if (pos == null) return null;
    const $pos = editor.state.doc.resolve(pos);
    for (let d = $pos.depth; d > 0; d--) {
      const n = $pos.node(d);
      if (n.type.name === "databaseRecord") return n;
    }
    return null;
  }, [editor, getPos]);

  const pageId = useMemo(() => {
    const record = getParentRecord();
    if (!record) return null;
    let id: string | null = null;
    record.forEach((cell) => {
      if (cell.type.name === "titleCell") id = cell.attrs.pageId;
    });
    return id;
  }, [getParentRecord]);

  const page = useMemo(() => {
    if (!pageId || !pages) return null;
    return findPage(pages, pageId);
  }, [pages, pageId]);

  return (
    <NodeViewWrapper
      as="div"
      className="db-td db-td--edited-time"
      data-type="edited-time-cell"
    >
      <span className="db-cell-readonly">
        {page?.updatedAt ? new Date(page.updatedAt).toLocaleDateString() : ""}
      </span>
    </NodeViewWrapper>
  );
}
