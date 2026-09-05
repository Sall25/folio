import { useCallback } from "react";
import { Plus } from "lucide-react";
import { NodeViewContent } from "@tiptap/react";
import type { ListView } from "src/types";
import { recordSelection } from "../../utils/record-selection-store";
import { useDatabaseContext } from "../database-context";
import { useListLayout } from "../../hooks";
import { useNewRecordSkeleton } from "../database-table-node/use-new-record-skeleton";
import { GroupHeaders } from "../group-headers";
import "./database-list-node-view.scss";
import { Button } from "src/components/tiptap-ui-primitive/button";

export function DatabaseListNodeView() {
  const {
    db,
    attrs,
    source,
    sortedRecords,
    visibleProperties,
    onNewRecord,
    onNewRecordInGroup,
  } = useDatabaseContext();

  const databaseId = attrs.id;
  const activeView = db.activeView as ListView | undefined;

  // List layout — same rowSlots/headers machinery as the table, minus the
  // per-group column strip. Records self-position via grid-row from the
  // bridge's sortedRecordIds, which is published as THIS layout's rowSlots.
  const { listLayout } = useListLayout(sortedRecords, source ?? null, db);
  const { headers } = listLayout;

  const collapsedKeys = new Set(activeView?.collapsedGroups ?? []);

  const gridTemplateColumns = `minmax(220px, 1fr) repeat(${visibleProperties.length}, max-content)`;

  const toggleGroup = useCallback(
    (key: string) => {
      if (!activeView) return;
      const current = activeView.collapsedGroups ?? [];
      db.updateView(activeView.id, {
        collapsedGroups: current.includes(key)
          ? current.filter((k) => k !== key)
          : [...current, key],
      } as Partial<ListView>);
    },
    [activeView, db],
  );

  const { creating, start: handleNewRecord } = useNewRecordSkeleton(
    sortedRecords.length,
    onNewRecord,
  );

  const isEmpty = sortedRecords.length === 0;

  return (
    <div
      className="db-list"
      data-type="database-list"
      data-database-id={databaseId}
      onPointerDown={(e) => {
        const t = e.target as HTMLElement;
        if (t.closest(".db-record") || !databaseId) return;
        recordSelection.clear(databaseId);
      }}
    >
      {/* One flat grid — ProseMirror fills __body with the databaseRecord
          nodes; each positions itself on its grid-row from sortedRecordIds
          (this view's rowSlots). GroupHeaders sit at the label/new rows. */}
      <div
        className="db-list-grid"
        style={{
          display: "grid",
          gridTemplateColumns,
          width: "100%",
        }}
      >
        <GroupHeaders
          headers={headers}
          collapsedKeys={collapsedKeys}
          onToggle={toggleGroup}
          onNewInGroup={onNewRecordInGroup}
          classPrefix="db-list-group"
        />

        <NodeViewContent as="div" className="db-list-grid__body" />

        {creating && (
          <div
            className="db-list-skeleton-row"
            contentEditable={false}
            style={{ gridColumn: "1 / -1" }}
          >
            <span className="db-skeleton-bar" style={{ width: "40%" }} />
          </div>
        )}
      </div>

      {/* Ungrouped gets one trailing New page; grouped views get one per group
          from GroupHeaders. */}
      {headers.length === 0 && !isEmpty && (
        <Button
          type="button"
          className="db-new-row"
          contentEditable={false}
          onClick={handleNewRecord}
        >
          <Plus size={16} className="tiptap-button-icon" />
          <span className="tiptap-button-text">New Page</span>
        </Button>
      )}
    </div>
  );
}
