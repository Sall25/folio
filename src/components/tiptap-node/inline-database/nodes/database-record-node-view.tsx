// import {
//   NodeViewWrapper,
//   NodeViewContent,
//   type NodeViewProps,
// } from "@tiptap/react";
// import { useCallback, useEffect, useReducer } from "react";
// import type { DatabaseAttrs } from "../types/types";
// import { usePages } from "src/components/tiptap-templates/simple/use-pages";
// import type { Transaction } from "@tiptap/pm/state";
// import { DatabaseRecordListView } from "./database-record-list-view";
// import { DatabaseRecordBoardView } from "./database-record-board-view";
// import { DatabaseRecordGalleryView } from "./database-record-gallery-view";
// import { recordMatchesFilters } from "../utils/apply-filters";
// import { getSortOrder } from "../utils/apply-sorts";

// export function DatabaseRecordNodeView(props: NodeViewProps) {
//   const { node, getPos, editor } = props;
//   const { deletePageAsync } = usePages();

//   const getParentDatabase = useCallback(() => {
//     const pos = getPos?.();
//     if (pos == null) return null;
//     const $pos = editor.state.doc.resolve(pos);
//     for (let d = $pos.depth; d > 0; d--) {
//       const n = $pos.node(d);
//       if (n.type.name === "database") return n;
//     }
//     return null;
//   }, [editor, getPos]);

//   useEffect(() => {
//     const handleTransaction = ({
//       transaction,
//     }: {
//       transaction: Transaction;
//     }) => {
//       const meta = transaction.getMeta("requestDeleteRecord");
//       if (!meta) return;
//       if (meta.recordId !== node.attrs.id) return;

//       let pageId: string | null = null;
//       node.forEach((cell) => {
//         if (cell.type.name === "titleCell") pageId = cell.attrs.pageId;
//       });

//       if (pageId) deletePageAsync(pageId);
//       const db = getParentDatabase();
//       if (!db) return;
//       editor.commands.deleteDatabaseRecord(db.attrs.id, meta.recordId);
//     };

//     editor.on("transaction", handleTransaction);
//     return () => {
//       editor.off("transaction", handleTransaction);
//     };
//   }, [editor, node, deletePageAsync, getParentDatabase]);

//   const [, forceUpdate] = useReducer((x) => x + 1, 0);

//   useEffect(() => {
//     const handleTransaction = () => forceUpdate();
//     editor.on("transaction", handleTransaction);
//     return () => {
//       editor.off("transaction", handleTransaction);
//     };
//   }, [editor]);

//   const db = getParentDatabase();
//   if (!db) return null;

//   const attrs = db.attrs as DatabaseAttrs;
//   const activeView =
//     attrs.views.find((v) => v.id === attrs.activeViewId) ?? attrs.views[0];

//   // Collect all sibling records for sort order calculation
//   const allRecords: ReturnType<typeof node.copy>[] = [];
//   db.forEach((child) => {
//     if (child.type.name === "databaseRecord") allRecords.push(child);
//   });

//   // Apply filters — hide record if it doesn't match
//   if (!recordMatchesFilters(node, activeView.filters ?? [])) {
//     return <NodeViewWrapper as="div" style={{ display: "none" }} />;
//   }

//   // Apply sorts via CSS order
//   const sorts = activeView.sorts ?? [];
//   const order = getSortOrder(node, allRecords, sorts);

//   // ── Gallery view ──────────────────────────────────────────────────────────
//   if (activeView.type === "gallery") {
//     return <DatabaseRecordGalleryView {...props} />;
//   }
//   // ── Board view ────────────────────────────────────────────────────────────
//   if (activeView?.type === "board") {
//     return <DatabaseRecordBoardView {...props} />;
//   }
//   // ── List view ─────────────────────────────────────────────────────────────
//   if (activeView?.type === "list") {
//     return <DatabaseRecordListView {...props} />;
//   }

//   // ── Table view (default) ──────────────────────────────────────────────────
//   const gridTemplateColumns = attrs.properties
//     .map((p) => `${p.width ?? 160}px`)
//     .join(" ");

//   return (
//     <NodeViewWrapper
//       as="div"
//       className="db-row"
//       style={{ gridTemplateColumns: `${gridTemplateColumns} 1fr`, order }}
//     >
//       <NodeViewContent as="div" />
//     </NodeViewWrapper>
//   );
// }
import {
  NodeViewWrapper,
  NodeViewContent,
  type NodeViewProps,
} from "@tiptap/react";
import { useCallback, useEffect, useReducer } from "react";
import type { DatabaseAttrs } from "../types/types";
import { usePages } from "src/components/tiptap-templates/simple/use-pages";
import type { Transaction } from "@tiptap/pm/state";
import { DatabaseRecordListView } from "./database-record-list-view";
import { DatabaseRecordBoardView } from "./database-record-board-view";
import { DatabaseRecordGalleryView } from "./database-record-gallery-view";
import { recordMatchesFilters } from "../utils/apply-filters";

export function DatabaseRecordNodeView(props: NodeViewProps) {
  const { node, getPos, editor } = props;
  const { deletePageAsync } = usePages();

  const getParentDatabase = useCallback(() => {
    const pos = getPos?.();
    if (pos == null) return null;
    const $pos = editor.state.doc.resolve(pos);
    for (let d = $pos.depth; d > 0; d--) {
      const n = $pos.node(d);
      if (n.type.name === "database") return n;
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

      let pageId: string | null = null;
      node.forEach((cell) => {
        if (cell.type.name === "titleCell") pageId = cell.attrs.pageId;
      });

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
  const activeView =
    attrs.views.find((v) => v.id === attrs.activeViewId) ?? attrs.views[0];

  // Apply filters — hide record if it doesn't match
  if (!recordMatchesFilters(node, activeView.filters ?? [])) {
    return <NodeViewWrapper as="div" style={{ display: "none" }} />;
  }

  // Apply hidden properties — build visible grid columns
  const hiddenProperties = new Set(activeView.hiddenProperties ?? []);
  const visibleProperties = attrs.properties.filter(
    (p) => !hiddenProperties.has(p.id),
  );
  const gridTemplateColumns = visibleProperties
    .map((p) => `${p.width ?? 160}px`)
    .join(" ");

  // ── Gallery view ──────────────────────────────────────────────────────────
  if (activeView.type === "gallery") {
    return <DatabaseRecordGalleryView {...props} />;
  }
  // ── Board view ────────────────────────────────────────────────────────────
  if (activeView?.type === "board") {
    return <DatabaseRecordBoardView {...props} />;
  }
  // ── List view ─────────────────────────────────────────────────────────────
  if (activeView?.type === "list") {
    return <DatabaseRecordListView {...props} />;
  }

  // ── Table view (default) ──────────────────────────────────────────────────
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
