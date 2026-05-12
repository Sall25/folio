import {
  NodeViewWrapper,
  NodeViewContent,
  type NodeViewProps,
} from "@tiptap/react";
import { useCallback, useEffect, useReducer } from "react";
import type { DatabaseAttrs } from "../types/types";
import { usePages } from "src/components/tiptap-templates/simple/use-pages";
import type { Transaction } from "@tiptap/pm/state";

export function DatabaseRecordNodeView({
  node,
  getPos,
  editor,
}: NodeViewProps) {
  const { deletePageAsync } = usePages();

  const getParentDatabase = useCallback(() => {
    const pos = getPos?.();
    if (pos == null) return null;
    const $pos = editor.state.doc.resolve(pos);
    for (let d = $pos.depth; d > 0; d--) {
      const node = $pos.node(d);
      if (node.type.name === "database") return node;
    }
    return null;
  }, [editor, getPos]);

  useEffect(() => {
    const handleTransaction = ({
      transaction,
    }: {
      transaction: Transaction;
    }) => {
      const meta = transaction.getMeta("requestDeleteRecord");
      if (!meta) return;
      if (meta.recordId !== node.attrs.id) return;

      // Find pageId from title cell
      let pageId: string | null = null;
      node.forEach((cell) => {
        if (cell.type.name === "titleCell") pageId = cell.attrs.pageId;
      });

      // Delete the page first, then the record
      if (pageId) deletePageAsync(pageId);
      const db = getParentDatabase();
      if (!db) return;
      editor.commands.deleteDatabaseRecord(db.attrs.id, meta.recordId);
    };

    editor.on("transaction", handleTransaction);
    return () => {
      editor.off("transaction", handleTransaction);
    };
  }, [editor, node, deletePageAsync, getParentDatabase]);

  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    const handleTransaction = () => forceUpdate();
    editor.on("transaction", handleTransaction);
    return () => {
      editor.off("transaction", handleTransaction);
    };
  }, [editor]);

  const db = getParentDatabase();

  if (!db) return null;

  const attrs = db.attrs as DatabaseAttrs;

  // const gridTemplateColumns = attrs.properties
  //   .map((p, i) => (i === 0 ? "1fr" : `${p.width ?? 160}px`))
  //   .join(" ");

  const gridTemplateColumns = attrs.properties
    .map((p) => `${p.width ?? 160}px`)
    .join(" ");
  return (
    <NodeViewWrapper
      as="div"
      className="db-row"
      style={{ gridTemplateColumns: `${gridTemplateColumns} 1fr` }}
    >
      <NodeViewContent as="div" />
    </NodeViewWrapper>
  );
}
