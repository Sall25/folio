import type { DatabaseProperty, ID } from "../../types/types";
import { PROPERTY_TYPE_ICONS } from "../../types/property-type-meta";
import {
  CardItemGroup,
  CardGroupLabel,
} from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";

interface PropertiesPanelProps {
  properties: DatabaseProperty[];
  selectedPropertyId: ID | undefined;
  onSelectProperty: (property: DatabaseProperty) => void;
}

export default function PropertiesPanel({
  properties,
  selectedPropertyId,
  onSelectProperty,
}: PropertiesPanelProps) {
  return (
    <CardItemGroup orientation="vertical" style={{ alignItems: "flex-start" }}>
      <CardGroupLabel>Properties</CardGroupLabel>
      {properties.map((prop) => {
        const Icon = PROPERTY_TYPE_ICONS[prop.config.type];
        return (
          <Button
            key={prop.id}
            variant="ghost"
            style={{ borderRadius: "var(--tt-radius-sm)" }}
            data-highlighted={prop.id === selectedPropertyId}
            onClick={() => onSelectProperty(prop)}
          >
            <Icon className="tiptap-button-icon" />
            <span className="tiptap-button-text">{prop.name}</span>
          </Button>
        );
      })}
    </CardItemGroup>
  );
}
