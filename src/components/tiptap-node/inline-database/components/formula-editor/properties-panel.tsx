import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
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
      style={{ alignItems: "stretch", gap: 6, width: "100%" }}
    >
      <CardGroupLabel>Properties</CardGroupLabel>

      {/* Auto-flowing grid: fits as many ~150px columns as the width allows,
          so the list wraps into 2–4 columns instead of one tall stack. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 4,
        }}
      >
        {properties.map((prop) => (
          <Button
            key={prop.id}
            variant="ghost"
            // Fill the grid cell, left-align content, keep icon/label spacing
            // (the old `tiptap-button-icon` class supplied the gap on Lucide
            // SVGs and is dead on a Material glyph <span>).
            style={{
              gap: 6,
              width: "100%",
              justifyContent: "flex-start",
              borderRadius: "var(--tt-radius-sm)",
            }}
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
            <DynamicIcon
              name={PROPERTY_TYPE_ICONS[prop.config.type]}
              size={16}
              filled={false}
            />
            <span
              className="tiptap-button-text"
              // Long names (Created_time, Multi_select) truncate instead of
              // blowing out their column.
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {prop.name}
            </span>
          </Button>
        ))}
      </div>
    </CardItemGroup>
  );
}
