import { useState } from "react";
import { nanoid } from "nanoid";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardBody,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import type { DatabaseProperty, DatabaseView, SortRule } from "src/types";
import { PROPERTY_TYPE_ICONS } from "src/types/property-type-meta";
import type { UseDatabaseReturn } from "../../hooks/use-database";
import "./sort-panel.scss";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";

export function SortPanel({
  properties,
  db,
  activeView,
  sorts,
  onClose,
}: {
  properties: DatabaseProperty[];
  db: UseDatabaseReturn;
  activeView: DatabaseView | undefined;
  sorts: SortRule[];
  onClose?: () => void;
}) {
  const [query, setQuery] = useState("");

  if (!activeView) return null;

  function addSortFor(property: DatabaseProperty) {
    // Don't duplicate a sort that already exists for this property
    if (sorts.some((s) => s.propertyId === property.id)) {
      onClose?.();
      return;
    }
    const newSort: SortRule = {
      id: nanoid(),
      propertyId: property.id,
      direction: "asc",
    };
    db.updateView(activeView!.id, { sorts: [...sorts, newSort] });
    onClose?.();
  }

  const q = query.trim().toLowerCase();
  // Only offer properties not already sorted by
  const available = properties.filter(
    (p) => !sorts.some((s) => s.propertyId === p.id),
  );
  const filtered = q
    ? available.filter((p) => p.name.toLowerCase().includes(q))
    : available;

  return (
    <Card className="db-sort-panel">
      <div className="db-sort-panel__search">
        <input
          autoFocus
          className="db-sort-panel__search-input"
          placeholder="Sort by..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <CardBody>
        <CardItemGroup>
          {filtered.length === 0 ? (
            <span className="db-panel__empty">
              {available.length === 0
                ? "Every property is already sorted"
                : "No properties found"}
            </span>
          ) : (
            filtered.map((p) => {
              // Material Symbols name string now, not an icon component.
              const iconName = PROPERTY_TYPE_ICONS[p.config.type];
              return (
                <Button
                  key={p.id}
                  variant="ghost"
                  style={{
                    justifyContent: "flex-start",
                    width: "100%",
                    borderRadius: "var(--tt-radius-sm)",
                  }}
                  onClick={() => addSortFor(p)}
                >
                  {iconName && (
                    <DynamicIcon
                      name={iconName}
                      size={20}
                      filled={false}
                      className="tiptap-button-icon"
                    />
                  )}
                  <span className="tiptap-button-text">{p.name}</span>
                </Button>
              );
            })
          )}
        </CardItemGroup>
      </CardBody>
    </Card>
  );
}
