import { Check, X } from "lucide-react";
import { useMemo, useState } from "react";
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

export interface PersonCellDisplayProps {
  value: PersonValue[];
  /** all selectable people — caller supplies (workspace members) */
  people: PersonValue[];
  onChange: (value: PersonValue[]) => void;
  /** when true, picking caps the selection at one person */
  single?: boolean;
  readonly?: boolean;
}

export function PersonCellDisplay({
  value,
  people,
  onChange,
  single,
  readonly,
}: PersonCellDisplayProps) {
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

  const chips =
    value.length === 0 ? (
      <span className="db-person-empty">Empty</span>
    ) : (
      value.map((p) => <PersonChip key={p.id} person={p} />)
    );

  if (readonly) return <div className="db-td--person">{chips}</div>;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          style={{
            background: "transparent",
            width: "100%",
            justifyContent: "flex-start",
            minHeight: 28,
            flexWrap: "wrap",
            gap: 4,
          }}
        >
          {chips}
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start">
        <Card style={{ padding: 6, minWidth: 240 }}>
          <input
            autoFocus
            className="db-person-search"
            placeholder="Search for a person…"
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
                No people found
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
        </Card>
      </PopoverContent>
    </Popover>
  );
}
