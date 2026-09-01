import { Check } from "lucide-react";
import { Fragment, memo, useMemo, useRef } from "react";
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
import type { DatabaseProperty, ID, Page } from "src/types";
import { PROPERTY_TYPE_ICONS } from "src/types/property-type-meta";

/** Text-ish types that edit as a plain input. */
const TEXT_TYPES = ["title", "text", "url", "email", "phone", "number"];
/** Types with an enumerable option set. */
const OPTION_TYPES = ["select", "status", "multi_select"];

type RawOption = { id: string; name?: string; label?: string; value?: string };

function optionsOf(prop: DatabaseProperty): { id: string; name: string }[] {
  const raw = (prop.config as { options?: RawOption[] }).options ?? [];
  return raw.map((o) => ({
    id: o.id,
    name: o.name ?? o.label ?? o.value ?? "",
  }));
}

interface PropertyControlsProps {
  properties: DatabaseProperty[];
  records: Page[];
  editingId: ID | null;
  draft: string;
  onDraftChange: (d: string) => void;
  onEdit: (id: ID | null) => void;
  onSetValue: (propertyId: ID, value: unknown) => void;
}

function PropertyControlsImpl({
  properties,
  records,
  editingId,
  draft,
  onDraftChange,
  onEdit,
  onSetValue,
}: PropertyControlsProps) {
  const inputRef = useRef<HTMLInputElement>(null);

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

  const commitText = (prop: DatabaseProperty) => {
    const value =
      prop.config.type === "number"
        ? draft.trim() === ""
          ? null
          : Number(draft)
        : draft;
    onSetValue(prop.id, value);
    onEdit(null);
  };

  /**
   * Opening an editor is a reaction to a click, not a synchronization — so the
   * draft is seeded here rather than in an effect keyed on `editingId`
   * (which would be a synchronous setState in an effect body).
   */
  const openEditor = (prop: DatabaseProperty) => {
    if (TEXT_TYPES.includes(prop.config.type)) {
      const { mixed, value } = sharedValue(prop);
      onDraftChange(mixed ? "" : value == null ? "" : String(value));
    }
    onEdit(prop.id);
  };

  return (
    <div className="db-selection-toolbar__props">
      {properties.map((prop, index) => {
        const isEditing = editingId === prop.id;
        const { mixed, value } = sharedValue(prop);

        // ── Inline text editor ──────────────────────────────────────
        if (isEditing && TEXT_TYPES.includes(prop.config.type)) {
          return (
            <Fragment key={prop.id}>
              {index > 0 && <Separator orientation="vertical" />}
              <Input
                autoFocus
                ref={inputRef}
                className="db-selection-toolbar__input"
                value={draft}
                placeholder={mixed ? "Mixed values" : prop.name}
                type={prop.config.type === "number" ? "number" : "text"}
                onChange={(e) => onDraftChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitText(prop);
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    onEdit(null);
                  }
                }}
                onBlur={() => commitText(prop)}
              />
            </Fragment>
          );
        }

        // ── Inline option picker ────────────────────────────────────
        if (isEditing && OPTION_TYPES.includes(prop.config.type)) {
          return (
            <Fragment key={prop.id}>
              {index > 0 && <Separator orientation="vertical" />}
              <Popover open onOpenChange={(o) => !o && onEdit(null)}>
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
                                onEdit(null);
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
                            onEdit(null);
                          }}
                        >
                          <span className="tiptap-button-text">Clear</span>
                        </Button>
                      </CardItemGroup>
                    </CardBody>
                  </Card>
                </PopoverContent>
              </Popover>
            </Fragment>
          );
        }

        // ── Collapsed chip ──────────────────────────────────────────
        return (
          <Fragment key={prop.id}>
            {index > 0 && <Separator orientation="vertical" />}
            <button
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
          </Fragment>
        );
      })}
    </div>
  );
}

export const PropertyControls = memo(PropertyControlsImpl);
