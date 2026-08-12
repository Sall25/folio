// The table view's rendered body: the header row, the node-rendered grid
// (ProseMirror puts databaseRecord > databaseCell here via NodeViewContent),
// the "New" record button, and the calculations footer.

import React, { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { DatabaseCalculations } from "../components/database-calculations";
import { DatabaseTableHeader } from "./database-table-header";
import {
  DEFAULT_CONFIGS,
  type DatabaseProperty,
  type ID,
  type PropertyConfig,
  type TableView,
} from "src/types";
import { recordSelection } from "../utils/record-selection-store";
import { FreezeDivider } from "../components/freeze-divider";
import { useDatabaseContext } from "./database-context";
import "./database-table-body.scss";
import { Chevron } from "src/components/tiptap-ui-primitive/chevron";
import { useDataSource } from "../hooks/use-data-source";

type PropertyType = PropertyConfig["type"];

/** How many rows to draw when the table has no records. The first one carries
    the "New page" affordance; the rest are pure ghosts. */
const EMPTY_PLACEHOLDER_ROWS = 3;

interface Props {
  tableRef: React.RefObject<HTMLDivElement | null>;
  gridTemplateColumns: string;
  bodyGridTemplateColumns: string;
  widthFor: (p: DatabaseProperty) => number;
  onCommitColumnWidth: (
    ref: { current: HTMLElement | null } | undefined,
    width: number,
  ) => void;

  collapsedKeys: Set<string>;
}

const EMPTY_PROPERTIES: DatabaseProperty[] = [];

export function DatabaseTableBody({
  tableRef,
  gridTemplateColumns,
  bodyGridTemplateColumns,
  widthFor,
  onCommitColumnWidth,
  collapsedKeys,
}: Props) {
  const {
    db,
    tableLayout,
    onNewRecord,
    onNewRecordInGroup,
    attrs,
    sortedRecords,
    visibleProperties,
    source,
  } = useDatabaseContext();
  const { updatePropertiesAsync } = useDataSource(source?.id);
  const databaseId = attrs.id;
  const activeView = db.activeView;
  const allProperties = attrs.properties ?? EMPTY_PROPERTIES;
  const locked = !!attrs.locked;
  const { headers } = tableLayout;

  const onReorder = useCallback(
    (orderedIds: ID[]) => db.reorderProperties(orderedIds),
    [db],
  );

  const onAddProperty = useCallback(
    (type: PropertyType, propertyName?: string) => {
      if (locked || !source) return;
      updatePropertiesAsync([
        ...source.properties,
        {
          id: crypto.randomUUID(),
          name: propertyName ?? type.charAt(0).toUpperCase() + type.slice(1),
          config: DEFAULT_CONFIGS[type],
          width: 160,
        },
      ]);
      // Cells for the new property are inserted by useDatabaseCellSync.
    },
    [source, updatePropertiesAsync, locked],
  );

  // An empty database renders as a bare header — it doesn't read as a table at
  // all. These rows give it shape. They are PURELY presentational: no records
  // back them, ProseMirror doesn't own them (contentEditable={false}), and they
  // vanish the moment a real record lands.
  //
  // The first row's first cell carries the "New page" action, so the primary
  // call to action sits exactly where the first record's title will appear. The
  // standalone button below is redundant while empty, so it's hidden — as is the
  // calculations footer, which has nothing to count.
  const isEmpty = sortedRecords.length === 0;

  // The body grid has exactly one track per property (no trailing 1fr — that's
  // header-only). The placeholder rows add their own trailing track so they
  // reach the table's right edge.
  const placeholderGridTemplateColumns = `${bodyGridTemplateColumns} 1fr`;

  const toggleGroup = (key: string) => {
    const current = (activeView as TableView)?.collapsedGroups ?? [];
    if (activeView) {
      db.updateView(activeView.id, {
        collapsedGroups: current.includes(key)
          ? current.filter((k) => k !== key)
          : [...current, key],
      } as Partial<TableView>);
    }
  };

  const [hoveredPlaceholderRow, setHoveredPlaceholderRow] = useState<
    number | null
  >(null);

  return (
    <NodeViewWrapper
      as="div"
      ref={tableRef}
      className="db-table"
      data-type="database-table"
      data-locked={locked ? "true" : "false"}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onPointerDown={(e: any) => {
        if ((e.target as HTMLElement).closest(".db-record") || !databaseId)
          return;
        recordSelection.clear(databaseId);
      }}
    >
      <FreezeDivider
        containerRef={tableRef}
        visibleProperties={visibleProperties}
        frozenPropertyId={
          [...visibleProperties]
            .reverse()
            .find((p) => activeView && db.isFrozen(activeView.id, p.id))?.id ??
          null
        }
        onFreeze={(propId) =>
          activeView && db.freezeProperty(activeView.id, propId)
        }
      />
      <DatabaseTableHeader
        visibleProperties={visibleProperties}
        allProperties={allProperties}
        activeView={activeView}
        locked={locked}
        gridTemplateColumns={gridTemplateColumns}
        widthFor={widthFor}
        onReorder={onReorder}
        onAddProperty={onAddProperty}
        onCommitColumnWidth={onCommitColumnWidth}
      />

      {/* Body — ProseMirror renders databaseRecord > databaseCell here. */}
      <div
        className="db-node-grid"
        style={{
          display: "grid",
          gridTemplateColumns: `${bodyGridTemplateColumns} 1fr`,
        }}
      >
        {headers.map((h) => {
          const expanded = !collapsedKeys.has(h.key);
          return (
            <div
              key={h.key}
              className="db-group-header"
              style={{ gridColumn: "1 / -1", gridRow: h.row }}
              contentEditable={false}
              onClick={() => toggleGroup(h.key)}
            >
              <Chevron
                expanded={expanded}
                size="default"
                aria-label={expanded ? "Collapse group" : "Expand group"}
              />
              <Button data-highlighted={true}>
                <span className="tiptap-button-text">{h.label}</span>
                {/* <span className="db-group-header__count">{h.count}</span> */}
              </Button>
            </div>
          );
        })}
        {headers.map((h) => {
          const expanded = !collapsedKeys.has(h.key);
          return expanded ? (
            <div
              key={`new-${h.key}`}
              className="db-group-new"
              style={{ gridColumn: "1 / -1", gridRow: h.newRow }}
              contentEditable={false}
            >
              <Button
                variant="ghost"
                className="db-group-new__button"
                onClick={() => onNewRecordInGroup(h.key)}
              >
                <Plus className="tiptap-button-icon" />
                <span className="tiptap-button-text">New page</span>
              </Button>
            </div>
          ) : null;
        })}
        <NodeViewContent as="div" className="db-node-grid__body" />
      </div>

      {/* Empty state — ghost rows, with "New page" living in the first cell. */}
      {/* Empty state — ghost rows; "New page" appears in the hovered row. */}
      {isEmpty && (
        <div className="db-table__placeholder" contentEditable={false}>
          {Array.from({ length: EMPTY_PLACEHOLDER_ROWS }).map((_, row) => (
            <div
              key={row}
              className="db-table__placeholder-row"
              onMouseEnter={() => setHoveredPlaceholderRow(row)}
              onMouseLeave={() =>
                setHoveredPlaceholderRow((r) => (r === row ? null : r))
              }
              onClick={onNewRecord}
              style={{
                display: "grid",
                gridTemplateColumns: placeholderGridTemplateColumns,
                cursor: "pointer",
              }}
            >
              {visibleProperties.map((prop, col) =>
                hoveredPlaceholderRow === row && col === 0 ? (
                  <div key={prop.id} className="db-table__placeholder-cell">
                    <span className="db-table__placeholder-new">
                      <Plus className="tiptap-button-icon" size={15} />
                      <span className="tiptap-button-text">New page</span>
                    </span>
                  </div>
                ) : (
                  <div key={prop.id} className="db-table__placeholder-cell" />
                ),
              )}
              <div className="db-table__placeholder-cell db-table__placeholder-cell--trailing" />
            </div>
          ))}
        </div>
      )}

      {/* New record — redundant while empty (the first ghost cell carries it). */}
      {!isEmpty && (
        <div
          contentEditable={false}
          style={{
            opacity: 1,
            pointerEvents: "auto",
          }}
        >
          <Button
            variant="ghost"
            style={{
              background: "transparent",
              justifyContent: "flex-start",
              borderRadius: "var(--tt-radius-sm)",
              color: "var(--tt-text-secondary)",
              fontSize: 14,
              lineHeight: 1.4,
              cursor: "pointer",
              fontWeight: 400,
            }}
            onClick={onNewRecord}
          >
            <Plus className="tiptap-button-icon" />
            <span className="tiptap-button-text">New page</span>
          </Button>
        </div>
      )}

      {/* Calculations footer — nothing to compute over an empty table. */}
      {!isEmpty && (
        <div contentEditable={false}>
          <DatabaseCalculations
            properties={visibleProperties}
            records={sortedRecords}
            gridTemplateColumns={gridTemplateColumns}
          />
        </div>
      )}
    </NodeViewWrapper>
  );
}
