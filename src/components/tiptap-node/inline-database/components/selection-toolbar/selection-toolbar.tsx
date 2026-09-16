import { useCallback, useState } from "react";
import { Card } from "src/components/tiptap-ui-primitive/card";
import type { DatabaseProperty, ID } from "src/types";
import { recordSelection } from "../../utils/record-selection-store";
import "./selection-toolbar.scss";
import { useDatabaseContext } from "../../context/database-context";
import { useDataSource } from "../../hooks/use-data-source";
import { removeRecordNodes } from "../../utils/remove-record-nodes";
import { SelectionCount } from "./selection-count";
import { PropertyControls } from "./property-controls";
import { DeleteButton } from "./delete-button";
import { ActionMenu } from "./action-menu";
import { ClearSelectionButton } from "./clear-selection-button";
import { Separator } from "src/components/tiptap-ui-primitive/separator";

/** Computed — never editable. */
const READONLY_TYPES = [
  "formula",
  "rollup",
  "created_time",
  "edited_time",
  "created_by",
  "edited_by",
];

const EMPTY_PROPERTIES: DatabaseProperty[] = [];

/**
 * Bulk-action bar shown while records are selected.
 *
 * Property chips edit INLINE: clicking one swaps it for an editor scoped to
 * that property, applied across the whole selection. The ellipsis menu keeps
 * the fuller action set (favorites, comment, move, trash).
 *
 * `recordIds` must be the VISIBLE selection (selection ∩ sortedRecordIds) —
 * selection survives filter changes, so a record can stay selected while
 * filtered out, and bulk edits must only touch what the user can see.
 */
export function SelectionToolbar({
  onDuplicate,
}: {
  /** The selected records, for reading current values. */
  onDuplicate?: () => void;
}) {
  const {
    attrs,
    visibleSelection: recordIds,
    source,
    selectedRecords: records,
    editor,
  } = useDatabaseContext();
  const databaseId = attrs.id;
  const properties = source?.properties ?? EMPTY_PROPERTIES;

  const { setCellValue, removeRecordAsync } = useDataSource(source?.id);

  const onSetValue = useCallback(
    (propertyId: ID, value: unknown) =>
      recordIds.forEach((id) => setCellValue(id, propertyId, value as never)),
    [recordIds, setCellValue],
  );

  const onDelete = useCallback(() => {
    if (editor && attrs.id) {
      // Two operations, as the record-delete contract requires:
      // 1) the pages (data)   2) the nodes (document)
      recordIds.forEach((id) => removeRecordAsync(id));
      removeRecordNodes(editor, attrs.id, recordIds);
    }
  }, [recordIds, removeRecordAsync, editor, attrs.id]);

  const onDeleteSelection = useCallback(() => {
    onDelete();
    recordSelection.clear(databaseId);
  }, [onDelete, databaseId]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const editable = properties.filter(
    (p) => !READONLY_TYPES.includes(p.config.type),
  );

  const onClearSelection = useCallback(
    () => recordSelection.clear(databaseId),
    [databaseId],
  );

  if (recordIds?.length === 0) return null;

  return (
    <Card
      className="db-selection-toolbar"
      contentEditable={false}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="db-selection-toolbar__row">
        {/* Fixed left — never scrolls */}
        <div className="db-selection-toolbar__lead">
          <SelectionCount count={recordIds.length} />
        </div>
        <Separator orientation="vertical" />

        {/* Scrollable middle — property chips grow here and scroll when they
            overflow, so they never collide with the trailing actions. */}
        <div className="db-selection-toolbar__scroll">
          <PropertyControls
            properties={editable}
            records={records}
            editingId={editingId}
            draft={draft}
            onDraftChange={setDraft}
            onEdit={setEditingId}
            onSetValue={onSetValue}
          />
        </div>

        {/* Fixed right — always visible */}
        <div className="db-selection-toolbar__actions">
          <DeleteButton count={recordIds.length} onDelete={onDeleteSelection} />
          <Separator orientation="vertical" />
          <ActionMenu
            open={menuOpen}
            onOpenChange={setMenuOpen}
            recordIds={recordIds}
            properties={properties}
            onSetValue={onSetValue}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
          />
          <Separator orientation="vertical" />
          <ClearSelectionButton onClick={onClearSelection} />
        </div>
      </div>
    </Card>
  );
}
