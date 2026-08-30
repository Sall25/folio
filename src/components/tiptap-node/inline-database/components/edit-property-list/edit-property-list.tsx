// ─── EditPropertyList ───────────────────────────────────────────────────────
// The "Edit property" submenu: every property in the database, with its type
// icon and name. Picking one navigates to that property's value editor
// (EditPropertyValue) for the current record. This is the right-hand list in the
// card menu.
import { MenuRow } from "../menu-row";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import { PROPERTY_TYPE_ICONS } from "src/types/property-type-meta";
import type { DatabaseProperty, ID } from "src/types";
import { Card } from "src/components/tiptap-ui-primitive/card";

export function EditPropertyList({
  properties,
  onPick,
}: {
  properties: DatabaseProperty[];
  onPick: (propertyId: ID) => void;
}) {
  return (
    <Card style={{ padding: "5px 10px", borderRadius: "var(--tt-radius-sm)" }}>
      {properties.map((prop) => (
        <MenuRow
          key={prop.id}
          // Property-type icon (Title, Status, Author…) via the shared map.
          Icon={() => (
            <DynamicIcon
              name={PROPERTY_TYPE_ICONS[prop.config.type]}
              size={16}
              className="tiptap-button-icon"
            />
          )}
          label={prop.name}
          onClick={() => onPick(prop.id)}
        />
      ))}
    </Card>
  );
}
