import { useCallback } from "react";
import { Plus } from "lucide-react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { DatabaseCalculations } from "../../components/database-calculations";
import { DatabaseTableHeader } from "./database-table-header";
import {
  DEFAULT_CONFIGS,
  type DatabaseProperty,
  type ID,
  type PropertyConfig,
  type TableView,
} from "src/types";
import { recordSelection } from "../../utils/record-selection-store";
import { FreezeDivider } from "../../components/freeze-divider";
import { useDatabaseContext } from "../../context/database-context";
import "./database-table-body.scss";
import { useDataSource } from "../../hooks/use-data-source";
import { useNewRecordSkeleton } from "./use-new-record-skeleton";
import { TablePlaceholder } from "./table-placeholder";
import { TableSkeletonRow } from "./table-skeleton-row";
import "./database-table-body.scss";
import "./database-table-node-view.scss";
import { GroupHeaders } from "../../components/group-headers/group-headers";

type PropertyType = PropertyConfig["type"];
const EMPTY_PROPERTIES: DatabaseProperty[] = [];

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
    },
    [source, updatePropertiesAsync, locked],
  );

  const isEmpty = sortedRecords.length === 0;
  const trailingGrid = `${bodyGridTemplateColumns} 300px`;

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

  const { creating, start: handleNewRecord } = useNewRecordSkeleton(
    sortedRecords.length,
    onNewRecord,
  );

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

      {headers.length === 0 && (
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
      )}

      {/* Body — ProseMirror renders databaseRecord > databaseCell here. */}
      <div
        className="db-node-grid"
        style={{
          display: "grid",
          width: "max-content",
          minWidth: "100%",
          gridTemplateColumns: trailingGrid,
        }}
      >
        <GroupHeaders
          headers={headers}
          collapsedKeys={collapsedKeys}
          onToggle={toggleGroup}
          onNewInGroup={onNewRecordInGroup}
          classPrefix="db-group"
        />

        {/* Full interactive column header per (expanded) group, subgrid-aligned
            to the record columns. Drag/resize/menus all call schema-level
            mutations, so acting in one group's header updates every group. */}
        {headers.map((h) =>
          collapsedKeys.has(h.key) ? null : (
            <DatabaseTableHeader
              key={`hdr-${h.key}`}
              subgrid
              gridRow={h.columnsRow}
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
          ),
        )}

        <NodeViewContent as="div" className="db-node-grid__body" />

        {creating && (
          <TableSkeletonRow
            visibleProperties={visibleProperties}
            gridTemplateColumns={trailingGrid}
          />
        )}
      </div>

      {isEmpty && (
        <TablePlaceholder
          visibleProperties={visibleProperties}
          gridTemplateColumns={trailingGrid}
          onNewRecord={onNewRecord}
        />
      )}

      {!isEmpty && headers.length === 0 && (
        <div
          contentEditable={false}
          style={{
            opacity: 1,
            pointerEvents: "auto",
            position: "sticky",
            left: 0,
            width: "fit-content",
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
            onClick={handleNewRecord}
          >
            <Plus className="tiptap-button-icon" />
            <span className="tiptap-button-text">New page</span>
          </Button>
        </div>
      )}

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
