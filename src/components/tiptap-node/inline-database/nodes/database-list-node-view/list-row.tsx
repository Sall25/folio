import { Cell } from "../../components/cells/cell";
import type {
  DatabaseProperty,
  CellValue,
  DatabaseView,
  Page,
  ID,
  PropertyType,
} from "src/types";
import "./database-list-node-view.scss";
import { memo, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import {
  recordSelection,
  useRecordRowState,
} from "../../utils/record-selection-store";
import { useRowAnchor } from "../../hooks/use-row-anchor";
import { beginRowDragSelect } from "../../utils/row-drag-select";

function ListRowImpl({
  record,
  databaseId,
  inlineProperties,
  titleProp,
  onChange,
  view,
  columnValuesByProp,
}: {
  record: Page;
  databaseId: string | null;
  inlineProperties: DatabaseProperty[];
  titleProp: DatabaseProperty | undefined;
  onChange: (rec: Page, propId: ID, v: CellValue<PropertyType>) => void;
  view: DatabaseView;
  columnValuesByProp: Record<string, CellValue[]>;
}) {
  const onCellChange = useCallback(
    (v: CellValue) => {
      if (!titleProp) return;
      onChange(record, titleProp.id, v);
    },
    [onChange, titleProp, record],
  );

  const [wrapperEl, setWrapperEl] = useState<HTMLElement | null>(null);
  const [pointerOnCheckbox, setPointerOnCheckbox] = useState(false);
  const { isSelected, isHovered } = useRecordRowState(databaseId, record.id);

  const showCheckbox =
    !!databaseId && (isHovered || isSelected || pointerOnCheckbox);

  const anchor = useRowAnchor(wrapperEl, showCheckbox);

  return (
    <div
      ref={setWrapperEl}
      className="db-list-row"
      data-record-id={record.id}
      data-selected={isSelected || undefined}
      data-hovered={isHovered || undefined}
      style={{ position: "relative" }}
      // The list has no drag handle to publish hover (unlike the table), so the
      // row publishes it itself. The store defers clearing, so moving onto the
      // portaled checkbox doesn't drop the hover.
      onMouseEnter={() => recordSelection.setHovered(record.id)}
      onMouseLeave={() => recordSelection.setHovered(null)}
      onPointerDown={(e) => {
        if (!databaseId) return;
        const target = e.target as HTMLElement;
        const inEditable = target.closest(
          '[contenteditable="true"], input, textarea, button, a, [role="button"]',
        );
        const hasSelection = recordSelection.get(databaseId).length > 0;
        if (inEditable && !hasSelection) return;
        beginRowDragSelect(databaseId, record.id, wrapperEl, e);
      }}
    >
      {showCheckbox &&
        anchor &&
        createPortal(
          <span
            className="db-record__select"
            contentEditable={false}
            onPointerEnter={() => setPointerOnCheckbox(true)}
            onPointerLeave={() => setPointerOnCheckbox(false)}
            style={{ top: anchor.top + 17, left: anchor.left - 16 }}
          >
            <input
              type="checkbox"
              checked={isSelected}
              aria-label="Select record"
              draggable={false}
              onClick={(e) => {
                e.stopPropagation();
                recordSelection.toggle(databaseId, record.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onChange={() => {}}
            />
          </span>,
          document.body,
        )}

      <div className="db-list-row__title">
        {titleProp && (
          <Cell
            property={titleProp}
            value={(record.values?.[titleProp.id] ?? null) as CellValue | null}
            record={record}
            onChange={onCellChange}
            view={view}
            properties={inlineProperties}
            columnValues={columnValuesByProp[titleProp.id]}
          />
        )}
      </div>

      <div className="db-list-row__props">
        {inlineProperties.map((prop) => (
          <Cell
            key={prop.id}
            property={prop}
            value={(record.values?.[prop.id] ?? null) as CellValue | null}
            record={record}
            onChange={onCellChange}
            view={view}
            properties={inlineProperties}
            columnValues={columnValuesByProp[prop.id]}
          />
        ))}
      </div>
    </div>
  );
}

export const ListRow = memo(ListRowImpl);
