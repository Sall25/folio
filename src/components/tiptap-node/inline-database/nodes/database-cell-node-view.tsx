// import { useCallback, useMemo } from "react";
// import { NodeViewWrapper } from "@tiptap/react";
// import type { NodeViewProps } from "@tiptap/core";
// import { useDatabaseBridgeData } from "../hooks/use-database-bridge-data";
// import { Cell } from "../components/cells/cell";
// import type { CellValue, DatabaseProperty, ID } from "src/types";
// import { CellOverlay } from "../components/cell-overlay";
// import { isCopiableType } from "./database-board-node-view/utils";
// import { usePageView } from "src/components/tiptap-templates/simple/context/page-view-context";
// import { useActivePage } from "src/components/tiptap-templates/simple/context/active-page-context";

// const EMPTY_PROPERTIES: DatabaseProperty[] = [];
// const EMPTY_COLUMN_VALUES: CellValue[] = [];

// export default function DatabaseCellNodeView({ node, editor }: NodeViewProps) {
//   const recordId = node.attrs.recordId as ID | null;
//   const propertyId = node.attrs.propertyId as ID | null;
//   const databaseId = node.attrs.databaseId as string | null;

//   const data = useDatabaseBridgeData(editor, databaseId);
//   const { setTarget } = usePageView();
//   const { setActivePageId } = useActivePage();

//   const properties = data?.properties ?? EMPTY_PROPERTIES;
//   const property = useMemo(
//     () => properties?.find((p) => p.id === propertyId) ?? null,
//     [properties, propertyId],
//   );

//   const isHidden = !!(
//     propertyId && data?.view?.hiddenProperties?.includes(propertyId)
//   );
//   const sticky = propertyId ? data?.stickyByProp?.[propertyId] : undefined;

//   const viewStyle = useMemo(() => {
//     const style: React.CSSProperties = {};
//     if (isHidden) style.display = "none";
//     if (sticky) {
//       style.position = "sticky";
//       style.left = sticky.left;
//       style.zIndex = 4;
//       style.background = "var(--tt-bg-color)";
//       if (sticky.isBoundary) {
//         style.borderRight = "2px solid var(--tt-border-color)";
//       }
//     }
//     return style;
//   }, [isHidden, sticky]);

//   const unwrapped = !!(
//     propertyId &&
//     data?.view?.type === "table" &&
//     data?.view?.unwrappedProperties?.includes(propertyId)
//   );

//   const setCellValue = data?.setCellValue;
//   const handleChange = useCallback(
//     (v: CellValue | null) =>
//       recordId && propertyId
//         ? setCellValue?.(recordId, propertyId, v)
//         : undefined,
//     [setCellValue, recordId, propertyId],
//   );

//   // Open routing — moved here from TitleCell, since the Open button now lives
//   // in the overlay this NodeView renders. Only used for the title cell.
//   const view = data?.view;
//   const handleOpen = useCallback(() => {
//     if (!recordId || !view) return;
//     if (view.openPageIn === "Side") {
//       setTarget({ pageId: recordId, view: "Peek" });
//     } else if (view.openPageIn === "Center") {
//       setTarget({ pageId: recordId, view: "Center" });
//     } else if (view.openPageIn === "Full") {
//       setActivePageId(recordId);
//     } else if (view.type === "gallery" || view.type === "board") {
//       setTarget({ pageId: recordId, view: "Center" });
//     } else {
//       setTarget({ pageId: recordId, view: "Peek" });
//     }
//   }, [recordId, view, setTarget, setActivePageId]);

//   if (!data || !property || !recordId || !propertyId) {
//     return (
//       <NodeViewWrapper
//         as="div"
//         data-type="database-cell"
//         className="db-node-cell"
//         style={viewStyle}
//         contentEditable={false}
//       />
//     );
//   }

//   const record = data.recordsById.get(recordId) ?? null;
//   const value = record?.values?.[propertyId] ?? null;
//   const isTitle = property.config.type === "title";

//   return (
//     <NodeViewWrapper
//       as="div"
//       data-type="database-cell"
//       data-cell-kind="atom"
//       className="db-node-cell db-node-cell--atom"
//       contentEditable={false}
//       style={viewStyle}
//     >
//       {record && (
//         <Cell
//           property={property}
//           properties={properties}
//           value={value}
//           record={record}
//           view={data.view}
//           columnValues={
//             data.columnValuesByProp[propertyId] ?? EMPTY_COLUMN_VALUES
//           }
//           templateCover={data.templateCover ?? null}
//           readonly={data.locked}
//           onChange={handleChange}
//           unwrapped={unwrapped}
//         />
//       )}
//       {!data.locked && (
//         <CellOverlay
//           copiable={!isTitle && isCopiableType(property.config.type)}
//           getCopyText={() => (value == null ? "" : String(value))}
//           onOpen={isTitle ? handleOpen : undefined}
//           viewType={data.view?.type}
//         />
//       )}
//     </NodeViewWrapper>
//   );
// }

import { useCallback, useMemo, useRef, useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import { useDatabaseBridgeData } from "../hooks/use-database-bridge-data";
import { Cell } from "../components/cells/cell";
import type { CellValue, DatabaseProperty, ID } from "src/types";
import { CellOverlay } from "../components/cell-overlay";
import { isCopiableType } from "./database-board-node-view/utils";
import { usePageView } from "src/components/tiptap-templates/simple/context/page-view-context";
import { useActivePage } from "src/components/tiptap-templates/simple/context/active-page-context";

const EMPTY_PROPERTIES: DatabaseProperty[] = [];
const EMPTY_COLUMN_VALUES: CellValue[] = [];

export default function DatabaseCellNodeView({ node, editor }: NodeViewProps) {
  const recordId = node.attrs.recordId as ID | null;
  const propertyId = node.attrs.propertyId as ID | null;
  const databaseId = node.attrs.databaseId as string | null;

  const data = useDatabaseBridgeData(editor, databaseId);

  const properties = data?.properties ?? EMPTY_PROPERTIES;
  const property = useMemo(
    () => properties?.find((p) => p.id === propertyId) ?? null,
    [properties, propertyId],
  );

  const isHidden = !!(
    propertyId && data?.view?.hiddenProperties?.includes(propertyId)
  );
  const sticky = propertyId ? data?.stickyByProp?.[propertyId] : undefined;

  const viewStyle = useMemo(() => {
    const style: React.CSSProperties = {};
    if (isHidden) style.display = "none";
    if (sticky) {
      style.position = "sticky";
      style.left = sticky.left;
      style.zIndex = 4;
      style.background = "var(--tt-bg-color)";
      if (sticky.isBoundary) {
        style.borderRight = "2px solid var(--tt-border-color)";
      }
    }
    return style;
  }, [isHidden, sticky]);

  const unwrapped = !!(
    propertyId &&
    data?.view?.type === "table" &&
    data?.view?.unwrappedProperties?.includes(propertyId)
  );

  const setCellValue = data?.setCellValue;
  const isTitle = property?.config.type === "title";

  const handleChange = useCallback(
    (v: CellValue | null) => {
      if (!recordId || !propertyId) return;
      setCellValue?.(recordId, propertyId, v);
    },
    [setCellValue, recordId, propertyId],
  );

  // ── List-view title: inline editing + open/edit overlay toggle ─────────────
  const isListView = data?.view?.type === "list";
  const isListTitle = isTitle && isListView;

  const [editing, setEditing] = useState(false);
  const titleRef = useRef<HTMLDivElement | null>(null);

  const { setTarget } = usePageView();
  const { setActivePageId } = useActivePage();

  const view = data?.view;

  const handleOpen = () => {
    if (!recordId || !view) return;
    if (view.openPageIn === "Side")
      setTarget({ pageId: recordId, view: "Peek" });
    else if (view.openPageIn === "Center")
      setTarget({ pageId: recordId, view: "Center" });
    else if (view.openPageIn === "Full") setActivePageId(recordId);
    else setTarget({ pageId: recordId, view: "Peek" });
  };

  const focusTitleEnd = () => {
    titleRef.current?.focus();
    const sel = window.getSelection();
    if (sel && titleRef.current) {
      const r = document.createRange();
      r.selectNodeContents(titleRef.current);
      r.collapse(false);
      sel.removeAllRanges();
      sel.addRange(r);
    }
  };

  if (!data || !property || !recordId || !propertyId) {
    return (
      <NodeViewWrapper
        as="div"
        data-type="database-cell"
        className="db-node-cell"
        style={viewStyle}
        contentEditable={false}
      />
    );
  }

  const record = data.recordsById.get(recordId) ?? null;
  const value = record?.values?.[propertyId] ?? null;

  return (
    <NodeViewWrapper
      as="div"
      data-type="database-cell"
      data-cell-kind="atom"
      className="db-node-cell db-node-cell--atom"
      contentEditable={false}
      style={viewStyle}
    >
      {record && (
        <Cell
          property={property}
          properties={properties}
          value={value}
          record={record}
          view={data.view}
          columnValues={
            data.columnValuesByProp[propertyId] ?? EMPTY_COLUMN_VALUES
          }
          templateCover={data.templateCover ?? null}
          readonly={data.locked}
          onChange={handleChange}
          unwrapped={unwrapped}
          {...(isListTitle
            ? {
                titleVariant: "inline" as const,
                onTitleEditingChange: setEditing,
                titleEditRef: titleRef,
              }
            : {})}
        />
      )}

      {!data.locked && (
        <CellOverlay
          viewType={data.view?.type}
          copiable={!isTitle && isCopiableType(property.config.type)}
          getCopyText={() => (value == null ? "" : String(value))}
          onOpen={isTitle ? handleOpen : undefined}
          editing={isListTitle ? editing : undefined}
          onEdit={isListTitle ? focusTitleEnd : undefined}
        />
      )}
    </NodeViewWrapper>
  );
}
