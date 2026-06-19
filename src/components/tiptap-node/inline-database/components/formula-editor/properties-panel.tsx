import type { DatabaseProperty, ID } from "src/types";
import { PROPERTY_TYPE_ICONS } from "src/types/property-type-meta";
import {
  CardItemGroup,
  CardGroupLabel,
} from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";

interface PropertiesPanelProps {
  properties: DatabaseProperty[];
  selectedPropertyId: ID | undefined;
  onSelectProperty: (property: DatabaseProperty) => void;
  // Optional: insert this property as prop("Name") into the formula. The
  // insert is focus-gated downstream (only happens when the editor has focus),
  // so when the editor is NOT focused this click is pure navigation.
  onInsertProperty?: (property: DatabaseProperty) => void;
}

export default function PropertiesPanel({
  properties,
  selectedPropertyId,
  onSelectProperty,
  onInsertProperty,
}: PropertiesPanelProps) {
  return (
    <CardItemGroup
      orientation="vertical"
      style={{ alignItems: "flex-start", gap: 5 }}
    >
      <CardGroupLabel>Properties</CardGroupLabel>
      {properties.map((prop) => {
        const Icon = PROPERTY_TYPE_ICONS[prop.config.type];
        return (
          <Button
            key={prop.id}
            variant="ghost"
            style={{ borderRadius: "var(--tt-radius-sm)" }}
            data-highlighted={prop.id === selectedPropertyId}
            // Prevent the click from blurring the formula editor. Without this,
            // mousedown moves focus to the button, the editor loses focus, and
            // the focus-gated insert would be skipped.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onSelectProperty(prop); // always navigate (show detail)
              onInsertProperty?.(prop); // insert only if editor focused (gated)
            }}
          >
            <Icon className="tiptap-button-icon" />
            <span className="tiptap-button-text">{prop.name}</span>
          </Button>
        );
      })}
    </CardItemGroup>
  );
}
