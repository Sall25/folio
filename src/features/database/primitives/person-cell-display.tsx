import { Check, X } from "src/components/icons";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import type { PersonValue } from "src/types";
import "./person-cell-display.scss";

function PersonChip({
  person,
  onRemove,
}: {
  person: PersonValue;
  onRemove?: () => void;
}) {
  return (
    <span className="db-person-chip">
      <span className="db-person-chip__avatar" aria-hidden>
        {person.avatarUrl ? (
          <img src={person.avatarUrl} alt="" />
        ) : (
          (person.name?.[0]?.toUpperCase() ?? "?")
        )}
      </span>
      <span className="db-person-chip__name">{person.name}</span>
      {onRemove && (
        <button
          type="button"
          className="db-person-chip__remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X size={11} />
        </button>
      )}
    </span>
  );
}

/** A group of people that can be assigned at once (the workspace's
 *  groups). */
export interface PersonGroupOption {
  id: string;
  name: string;
  members: PersonValue[];
}

export interface PersonCellDisplayProps {
  value: PersonValue[];
  /** all selectable people — caller supplies (workspace members) */
  people: PersonValue[];
  onChange: (value: PersonValue[]) => void;
  /** when true, picking caps the selection at one person */
  single?: boolean;
  readonly?: boolean;
  /** Groups: picking one adds its members (not with `single`). */
  groups?: PersonGroupOption[];
  /** Said under the list: who hears of being added. */
  notifyHint?: string;
}

/** More faces than this show as a stack with "+N". */
const STACK_MAX = 3;

// ...imports and PersonChip unchanged...

export function PersonCellDisplay({
  value,
  people,
  onChange,
  single,
  readonly,
  groups = [],
  notifyHint,
}: PersonCellDisplayProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedIds = useMemo(() => new Set(value.map((p) => p.id)), [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? people.filter((p) => p.name.toLowerCase().includes(q)) : people;
  }, [people, query]);

  function toggle(person: PersonValue) {
    if (selectedIds.has(person.id)) {
      onChange(value.filter((p) => p.id !== person.id));
    } else {
      const entry = {
        id: person.id,
        name: person.name,
        avatarUrl: person.avatarUrl,
      };
      onChange(single ? [entry] : [...value, entry]);
      if (single) setOpen(false);
    }
  }

  /** A group's members not already assigned, added together. */
  function addGroup(group: PersonGroupOption) {
    const toAdd = group.members.filter((m) => !selectedIds.has(m.id));
    if (toAdd.length) onChange([...value, ...toAdd]);
  }

  // One person: face and name. Several: a stack of faces with "+N", the
  // names on hover.
  const chips =
    value.length === 0 ? (
      <span className="db-person-empty">{t("database.person.empty")}</span>
    ) : value.length === 1 ? (
      <PersonChip person={value[0]} />
    ) : (
      <span
        className="db-person-stack"
        title={value.map((p) => p.name).join(", ")}
      >
        {value.slice(0, STACK_MAX).map((p) => (
          <span key={p.id} className="db-person-chip__avatar" aria-hidden>
            {p.avatarUrl ? (
              <img src={p.avatarUrl} alt="" />
            ) : (
              (p.name?.[0]?.toUpperCase() ?? "?")
            )}
          </span>
        ))}
        {value.length > STACK_MAX && (
          <span className="db-person-stack__more">
            +{value.length - STACK_MAX}
          </span>
        )}
        <span className="db-person-stack__label">
          {value.map((p) => p.name).join(", ")}
        </span>
      </span>
    );

  const triggerButton = (
    <Button
      variant="ghost"
      style={{
        background: "transparent",
        width: "100%",
        justifyContent: "flex-start",
        // As tall as its chips, like the select pill: the cell's own 34px
        // minimum sets the row height, never this button.
        height: "auto",
        minHeight: 0,
        lineHeight: 1.5,
        flexWrap: "wrap",
        padding: 0,
        gap: 4,
      }}
    >
      {chips}
    </Button>
  );

  if (readonly) return <div className="db-td--person">{chips}</div>;

  // Closed → plain trigger, no Radix Popover.
  if (!open) {
    return (
      <div
        role="button"
        tabIndex={0}
        style={{ display: "contents" }}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {triggerButton}
      </div>
    );
  }

  return (
    <Popover open onOpenChange={setOpen} defaultOpen>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent side="bottom" align="start">
        <Card style={{ padding: 6, minWidth: 240 }}>
          <input
            autoFocus
            className="db-person-search"
            placeholder={t("database.person.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {value.length > 0 && (
            <div className="db-person-selected">
              {value.map((p) => (
                <PersonChip
                  key={p.id}
                  person={p}
                  onRemove={() => onChange(value.filter((x) => x.id !== p.id))}
                />
              ))}
            </div>
          )}

          <CardItemGroup style={{ marginTop: 6 }}>
            {filtered.length === 0 ? (
              <span className="db-person-empty" style={{ padding: "4px 8px" }}>
                {t("database.person.none")}
              </span>
            ) : (
              filtered.map((p) => {
                const checked = selectedIds.has(p.id);
                return (
                  <Button
                    key={p.id}
                    variant="ghost"
                    style={{
                      justifyContent: "flex-start",
                      width: "100%",
                      borderRadius: "var(--tt-radius-sm)",
                      gap: 8,
                    }}
                    onClick={() => toggle(p)}
                  >
                    <span className="db-person-chip__avatar" aria-hidden>
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt="" />
                      ) : (
                        (p.name?.[0]?.toUpperCase() ?? "?")
                      )}
                    </span>
                    <span className="tiptap-button-text">{p.name}</span>
                    {checked && (
                      <Check size={14} style={{ marginLeft: "auto" }} />
                    )}
                  </Button>
                );
              })
            )}
          </CardItemGroup>

          {!single && groups.length > 0 && !query.trim() && (
            <CardItemGroup style={{ marginTop: 4 }}>
              <span className="db-person-hint">
                {t("database.assign.groups")}
              </span>
              {groups.map((g) => (
                <Button
                  key={g.id}
                  variant="ghost"
                  style={{
                    justifyContent: "flex-start",
                    width: "100%",
                    borderRadius: "var(--tt-radius-sm)",
                    gap: 8,
                  }}
                  onClick={() => addGroup(g)}
                >
                  <span className="tiptap-button-text">
                    {t("database.assign.group", {
                      name: g.name,
                      count: g.members.length,
                    })}
                  </span>
                </Button>
              ))}
            </CardItemGroup>
          )}

          {notifyHint && <p className="db-person-hint">{notifyHint}</p>}
        </Card>
      </PopoverContent>
    </Popover>
  );
}
