import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import { useDatabaseBridgeData } from "../../hooks/use-database-bridge-data";
import { Cell } from "../../components/cells/cell";
import type { CellValue, DatabaseProperty, ID } from "src/types";
import { CellOverlay } from "../../components/cell-overlay";
import { isCopiableType } from "../database-board-node-view/utils";
import { useOpenRecord } from "../../hooks/use-open-record";
import { useRecordNearScreen } from "../../utils/record-visibility";
import { formatUniqueId } from "src/lib/unique-id";
import {
  cellKey,
  cellText,
  parseCellText,
  registerCellClipboard,
} from "../../utils/cell-clipboard";
import { useWorkspacePeople } from "../../hooks/use-workspace-people";

const EMPTY_PROPERTIES: DatabaseProperty[] = [];
const EMPTY_COLUMN_VALUES: CellValue[] = [];

export default function DatabaseCellNodeView({ node, editor }: NodeViewProps) {
  const recordId = node.attrs.recordId as ID | null;
  const propertyId = node.attrs.propertyId as ID | null;
  const databaseId = node.attrs.databaseId as string | null;

  const data = useDatabaseBridgeData(editor, databaseId);
  const nearScreen = useRecordNearScreen(databaseId, recordId);

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

  // `editing`: the title has focus (the button shows Open).
  // `editRequested`: the Edit button was pressed — the title focuses itself,
  // caret at the end (TitleCellDisplay's autoEdit). Not set when the title is
  // clicked directly, so a click keeps its caret where it landed.
  const [editing, setEditing] = useState(false);
  const [editRequested, setEditRequested] = useState(false);
  const onTitleEditingChange = useCallback((next: boolean) => {
    setEditing(next);
    if (!next) setEditRequested(false);
  }, []);

  const view = data?.view;
  const openRecord = useOpenRecord(view);

  const handleOpen = () => {
    if (!recordId || !view) return;
    openRecord(recordId);
  };

  // Only a table or a list shows these cells. Board, gallery, calendar and
  // timeline records draw their own content (BoardCardBody, the bars) and
  // never mount the cells' DOM, so rendering a Cell there was pure waste.
  const shownAsCells =
    data?.view?.type === "table" || data?.view?.type === "list";

  const people = useWorkspacePeople();
  const clipboardValue =
    (recordId && propertyId
      ? data?.recordsById.get(recordId)?.values?.[propertyId]
      : null) ?? null;
  const clipboardRef = useRef({
    property,
    value: clipboardValue,
    handleChange,
    people,
  });
  useEffect(() => {
    clipboardRef.current = {
      property,
      value: clipboardValue,
      handleChange,
      people,
    };
  });

  useEffect(() => {
    if (!recordId || !propertyId) return;
    return registerCellClipboard(cellKey(recordId, propertyId), {
      copyText: () => {
        const { property, value } = clipboardRef.current;
        return property ? cellText(property, value) : "";
      },
      paste: (text) => {
        const { property, handleChange, people } = clipboardRef.current;
        const parsed = property ? parseCellText(property, text, people) : null;
        if (!parsed) return false;
        handleChange(parsed.value);
        return true;
      },
    });
  }, [recordId, propertyId]);

  // An empty, row-height cell: no data yet, a view that doesn't show cells,
  // or a row that hasn't come near the screen (utils/record-visibility.ts).
  if (
    !data ||
    !property ||
    !recordId ||
    !propertyId ||
    !shownAsCells ||
    !nearScreen
  ) {
    return (
      <NodeViewWrapper
        as="div"
        data-type="database-cell"
        className={`db-node-cell${data && property ? " db-node-cell--pending" : ""}`}
        style={viewStyle}
        contentEditable={false}
      />
    );
  }

  const record = data.recordsById.get(recordId) ?? null;
  const value = record?.values?.[propertyId] ?? null;
  // Conditional color on this cell alone (a table's "cell only" rule).
  const cellColor = data.recordColors?.[recordId]?.cells?.[propertyId];

  return (
    <NodeViewWrapper
      as="div"
      data-type="database-cell"
      data-cell-kind="atom"
      data-cc={cellColor}
      className="db-node-cell db-node-cell--atom"
      contentEditable={false}
      style={
        cellColor
          ? {
              ...viewStyle,
              "--cc-accent": `var(--tt-color-accent-${cellColor})`,
            }
          : viewStyle
      }
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
                autoEdit: editRequested,
                onEditingChange: onTitleEditingChange,
              }
            : {})}
        />
      )}

      {!data.locked && (
        <CellOverlay
          viewType={data.view?.type}
          copiable={!isTitle && isCopiableType(property.config.type)}
          getCopyText={() =>
            property.config.type === "unique_id"
              ? formatUniqueId(value, property.config)
              : value == null
                ? ""
                : String(value)
          }
          onOpen={isTitle ? handleOpen : undefined}
          editing={isListTitle ? editing : undefined}
          onEdit={
            isListTitle
              ? () => {
                  setEditing(true); // Open shows at once, focus or not
                  setEditRequested(true); // the title focuses, caret at the end
                }
              : undefined
          }
        />
      )}
    </NodeViewWrapper>
  );
}
