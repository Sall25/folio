import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import { Check, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import type { PersonCellAttrs, PersonValue } from "../types/types";
import { useCellPageSync } from "../hooks/use-cell-page-sync";
import { useIsPropertyHidden } from "../hooks/use-is-property-hidden";
import { useActiveViewType } from "../hooks/use-active-view-type";
import { useWorkspacePeople } from "../hooks/use-workspace-people";
import "./person-cell-node-view.scss";

function PersonChip({
  person,
  onRemove,
}: {
  person: PersonValue;
  onRemove?: () => void;
}) {
  return (
    <span className="db-person-chip" contentEditable={false}>
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

export function PersonCellNodeView({
  node,
  editor,
  getPos,
  updateAttributes,
}: NodeViewProps) {
  const personAttrs = node.attrs as PersonCellAttrs;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value: PersonValue[] = Array.isArray(personAttrs.value)
    ? personAttrs.value
    : [];

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const syncPage = useCellPageSync(getPos, updateAttributes);
  const isHidden = useIsPropertyHidden(editor, getPos, node.attrs.propertyId);
  const activeViewType = useActiveViewType(editor, getPos);
  const people = useWorkspacePeople();

  const selectedIds = useMemo(() => new Set(value.map((p) => p.id)), [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? people.filter((p) => p.name.toLowerCase().includes(q)) : people;
  }, [people, query]);

  if (isHidden) return <NodeViewWrapper as="div" style={{ display: "none" }} />;

  function commit(next: PersonValue[]) {
    syncPage(() => {
      updateAttributes({ ...personAttrs, value: next });
    }, node);
  }

  function toggle(person: PersonValue) {
    if (selectedIds.has(person.id)) {
      commit(value.filter((p) => p.id !== person.id));
    } else {
      commit([
        ...value,
        { id: person.id, name: person.name, avatarUrl: person.avatarUrl },
      ]);
    }
  }

  return (
    <NodeViewWrapper
      as="div"
      data-type="person-cell"
      className={`${activeViewType === "table" ? "db-td" : ""} db-td--person`}
      style={{ display: "flex", padding: "0 5px", margin: 0 }}
      contentEditable={false}
    >
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
            {value.length === 0 ? (
              <span className="db-person-empty">Empty</span>
            ) : (
              value.map((p) => <PersonChip key={p.id} person={p} />)
            )}
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
                    onRemove={() => commit(value.filter((x) => x.id !== p.id))}
                  />
                ))}
              </div>
            )}

            <CardItemGroup style={{ marginTop: 6 }}>
              {filtered.length === 0 ? (
                <span
                  className="db-person-empty"
                  style={{ padding: "4px 8px" }}
                >
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
                      <span
                        className="db-person-chip__avatar tiptap-button-icon"
                        aria-hidden
                      >
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
    </NodeViewWrapper>
  );
}
