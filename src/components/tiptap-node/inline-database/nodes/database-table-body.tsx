// The table view's rendered body: the header row, the node-rendered grid
// (ProseMirror puts databaseRecord > databaseCell here via NodeViewContent),
// the "New" record button, and the calculations footer.

import React from "react";
import { Plus } from "lucide-react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { DatabaseCalculations } from "../components/database-calculations";
import { DatabaseTableHeader } from "./database-table-header";
import type {
  DatabaseProperty,
  DatabaseView,
  PropertyConfig,
  Page,
  ID,
  TableView,
} from "src/types";
import { recordSelection } from "../utils/record-selection-store";
import { FreezeDivider } from "../components/freeze-divider";
import { useDatabaseContext } from "./database-context";
import type { GroupHeaderSlot } from "../utils/group-rows";
import "./database-table-body.scss";
import { Chevron } from "src/components/tiptap-ui-primitive/chevron";

type PropertyType = PropertyConfig["type"];

/** How many rows to draw when the table has no records. The first one carries
    the "New page" affordance; the rest are pure ghosts. */
const EMPTY_PLACEHOLDER_ROWS = 3;

interface Props {
  tableRef: React.RefObject<HTMLDivElement | null>;
  locked: boolean;

  visibleProperties: DatabaseProperty[];
  allProperties: DatabaseProperty[];
  activeView: DatabaseView | undefined;
  sortedRecords: Page[];

  gridTemplateColumns: string;
  bodyGridTemplateColumns: string;
  widthFor: (p: DatabaseProperty) => number;

  optionsMenu: React.ReactNode;

  onReorder: (orderedIds: string[]) => void;
  onAddProperty: (type: PropertyType, propertyName?: string) => void;
  onCommitColumnWidth: (
    ref: { current: HTMLElement | null } | undefined,
    width: number,
  ) => void;
  onNewRecord: () => void;

  headers: GroupHeaderSlot[];

  collapsedKeys: Set<string>;

  databaseId?: ID;

  onNewRecordInGroup: (groupKey: string) => void;
}

export function DatabaseTableBody({
  tableRef,
  locked,

  visibleProperties,
  allProperties,
  activeView,
  sortedRecords,
  gridTemplateColumns,
  bodyGridTemplateColumns,
  widthFor,
  optionsMenu,
  onReorder,
  onAddProperty,
  onCommitColumnWidth,
  onNewRecord,
  databaseId,
  headers,
  collapsedKeys,
  onNewRecordInGroup,
}: Props) {
  const { db } = useDatabaseContext();

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
        optionsMenu={optionsMenu}
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
      {isEmpty && (
        <div className="db-table__placeholder" contentEditable={false}>
          {Array.from({ length: EMPTY_PLACEHOLDER_ROWS }).map((_, row) => (
            <div
              key={row}
              className="db-table__placeholder-row"
              style={{
                display: "grid",
                gridTemplateColumns: placeholderGridTemplateColumns,
              }}
            >
              {visibleProperties.map((prop, col) =>
                row === 0 && col === 0 ? (
                  <div key={prop.id} className="db-table__placeholder-cell">
                    <Button
                      variant="ghost"
                      className="db-table__placeholder-new"
                      style={{
                        justifyContent: "flex-start",
                        width: "100%",
                        height: "100%",
                        borderRadius: 0,
                        color: "var(--tt-text-secondary)",
                        fontSize: 13,
                      }}
                      onClick={onNewRecord}
                    >
                      <Plus className="tiptap-button-icon" />
                      <span className="tiptap-button-text">New page</span>
                    </Button>
                  </div>
                ) : (
                  <div key={prop.id} className="db-table__placeholder-cell" />
                ),
              )}
              {/* Trailing cell fills to the table's right edge. */}
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
