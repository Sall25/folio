import { useMemo, useRef, useState } from "react";
import { Trash2, Ellipsis, X, Check } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardBody,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Input } from "src/components/tiptap-ui-primitive/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import { PROPERTY_TYPE_ICONS } from "src/types/property-type-meta";
import type { DatabaseProperty, Page } from "src/types";
import { recordSelection } from "../../utils/record-selection-store";
import { SelectionActionsMenu } from "../selection-actions-menu";
import "./selection-toolbar.scss";

/** Text-ish types that edit as a plain input. */
const TEXT_TYPES = ["title", "text", "url", "email", "phone", "number"];
/** Types with an enumerable option set. */
const OPTION_TYPES = ["select", "status", "multi_select"];
/** Computed — never editable. */
const READONLY_TYPES = [
  "formula",
  "rollup",
  "created_time",
  "edited_time",
  "created_by",
  "edited_by",
];

type RawOption = { id: string; name?: string; label?: string; value?: string };

function optionsOf(prop: DatabaseProperty): { id: string; name: string }[] {
  const raw = (prop.config as { options?: RawOption[] }).options ?? [];
  return raw.map((o) => ({
    id: o.id,
    name: o.name ?? o.label ?? o.value ?? "",
  }));
}

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
  databaseId,
  recordIds,
  records,
  properties,
  onSetValue,
  onDelete,
  onDuplicate,
}: {
  databaseId: string;
  recordIds: string[];
  /** The selected records, for reading current values. */
  records: Page[];
  properties: DatabaseProperty[];
  onSetValue: (propertyId: string, value: unknown) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const editable = properties.filter(
    (p) => !READONLY_TYPES.includes(p.config.type),
  );

  /**
   * The value shared by every selected record, or `mixed` when they differ.
   * Title lives on page.title rather than values[], so it's read separately.
   */
  const sharedValue = useMemo(() => {
    return (prop: DatabaseProperty): { mixed: boolean; value: unknown } => {
      if (records?.length === 0) return { mixed: false, value: null };
      const read = (r: Page) =>
        prop.config.type === "title"
          ? (r.title ?? null)
          : (r.values?.[prop.id] ?? null);
      const first = read(records[0]);
      const key = JSON.stringify(first);
      const same = records.every((r) => JSON.stringify(read(r)) === key);
      return { mixed: !same, value: same ? first : null };
    };
  }, [records]);

  if (recordIds?.length === 0) return null;

  const commitText = (prop: DatabaseProperty) => {
    const value =
      prop.config.type === "number"
        ? draft.trim() === ""
          ? null
          : Number(draft)
        : draft;
    onSetValue(prop.id, value);
    setEditingId(null);
  };

  // const editingProp = editingId
  //   ? properties.find((p) => p.id === editingId)
  //   : undefined;
  /**
   * Opening an editor is a reaction to a click, not a synchronization — so the
   * draft is seeded here rather than in an effect keyed on `editingId`
   * (which would be a synchronous setState in an effect body).
   */
  const openEditor = (prop: DatabaseProperty) => {
    if (TEXT_TYPES.includes(prop.config.type)) {
      const { mixed, value } = sharedValue(prop);
      setDraft(mixed ? "" : value == null ? "" : String(value));
    }
    setEditingId(prop.id);
  };
  return (
    <Card
      className="db-selection-toolbar"
      contentEditable={false}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <CardItemGroup orientation="horizontal">
        <span className="db-selection-toolbar__count">
          {recordIds?.length} selected
        </span>

        <div className="db-selection-toolbar__props">
          {editable.map((prop) => {
            const isEditing = editingId === prop.id;
            const { mixed, value } = sharedValue(prop);

            // ── Inline text editor ──────────────────────────────────────
            if (isEditing && TEXT_TYPES.includes(prop.config.type)) {
              return (
                <Input
                  key={prop.id}
                  autoFocus
                  ref={inputRef}
                  className="db-selection-toolbar__input"
                  value={draft}
                  placeholder={mixed ? "Mixed values" : prop.name}
                  type={prop.config.type === "number" ? "number" : "text"}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitText(prop);
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setEditingId(null);
                    }
                  }}
                  onBlur={() => commitText(prop)}
                />
              );
            }

            // ── Inline option picker ────────────────────────────────────
            if (isEditing && OPTION_TYPES.includes(prop.config.type)) {
              return (
                <Popover
                  key={prop.id}
                  open
                  onOpenChange={(o) => !o && setEditingId(null)}
                >
                  <PopoverTrigger asChild>
                    <span className="db-selection-toolbar__chip db-selection-toolbar__chip--active">
                      <DynamicIcon
                        name={PROPERTY_TYPE_ICONS[prop.config.type]}
                        size={16}
                        filled={false}
                        className="tiptap-button-icon"
                      />
                      <span className="db-selection-toolbar__chip-name">
                        {prop.name}
                      </span>
                    </span>
                  </PopoverTrigger>
                  <PopoverContent side="bottom" align="start">
                    <Card style={{ padding: 5, minWidth: 180 }}>
                      <CardBody style={{ width: "100%" }}>
                        <CardItemGroup>
                          {optionsOf(prop)?.length === 0 ? (
                            <span className="db-panel__empty">No options</span>
                          ) : (
                            optionsOf(prop).map((o) => (
                              <Button
                                key={o.id}
                                variant="ghost"
                                style={{
                                  justifyContent: "flex-start",
                                  width: "100%",
                                  borderRadius: "var(--tt-radius-sm)",
                                }}
                                onClick={() => {
                                  onSetValue(prop.id, o.id);
                                  setEditingId(null);
                                }}
                              >
                                <span className="tiptap-button-text">
                                  {o.name}
                                </span>
                                {!mixed && value === o.id && (
                                  <Check
                                    size={14}
                                    style={{ marginLeft: "auto" }}
                                  />
                                )}
                              </Button>
                            ))
                          )}
                          <Separator orientation="horizontal" />
                          <Button
                            variant="ghost"
                            style={{
                              justifyContent: "flex-start",
                              width: "100%",
                              borderRadius: "var(--tt-radius-sm)",
                            }}
                            onClick={() => {
                              onSetValue(prop.id, null);
                              setEditingId(null);
                            }}
                          >
                            <span className="tiptap-button-text">Clear</span>
                          </Button>
                        </CardItemGroup>
                      </CardBody>
                    </Card>
                  </PopoverContent>
                </Popover>
              );
            }

            // ── Collapsed chip ──────────────────────────────────────────
            return (
              <button
                key={prop.id}
                type="button"
                className="db-selection-toolbar__chip"
                title={prop.name}
                onClick={() => {
                  if (prop.config.type === "checkbox") {
                    onSetValue(prop.id, !(value === true));
                    return;
                  }
                  openEditor(prop);
                }}
              >
                <DynamicIcon
                  name={PROPERTY_TYPE_ICONS[prop.config.type]}
                  size={16}
                  filled={false}
                  className="tiptap-button-icon"
                />
                <span className="db-selection-toolbar__chip-name">
                  {prop.name}
                </span>
              </button>
            );
          })}
        </div>

        <Button
          variant="ghost"
          tooltip="Delete records"
          onClick={() => {
            onDelete();
            recordSelection.clear(databaseId);
          }}
        >
          <Trash2 className="tiptap-button-icon" size={16} />
        </Button>

        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" tooltip="Actions">
              <Ellipsis className="tiptap-button-icon" size={16} />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="end">
            <SelectionActionsMenu
              recordIds={recordIds}
              properties={properties}
              onSetValue={onSetValue}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onClose={() => setMenuOpen(false)}
            />
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          tooltip="Clear selection"
          onClick={() => recordSelection.clear(databaseId)}
        >
          <X className="tiptap-button-icon" size={16} />
        </Button>
      </CardItemGroup>
    </Card>
  );
}
