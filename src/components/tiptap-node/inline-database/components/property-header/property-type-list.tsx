// ─── PropertyTypeList ─────────────────────────────────────────────────────
// The list of selectable property types shown inside the "Change property
// type" flyout. Re-derives its data source from context so it needs no props

import {
  DEFAULT_CONFIGS,
  PROPERTY_TYPE_META,
  type DatabaseProperty,
} from "src/types";
import { useDatabaseContext } from "../../context/database-context";
import { useDataSource } from "../../hooks/use-data-source";
import { PROPERTY_TYPE_ICONS } from "src/types/property-type-meta";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";

// beyond the property itself.
export function PropertyTypeList({ prop }: { prop: DatabaseProperty }) {
  const { attrs } = useDatabaseContext();
  const { changePropertyTypeAsync } = useDataSource(attrs.sourceId);

  return (
    <>
      {PROPERTY_TYPE_META.filter((m) => m.type !== "title").map((m) => {
        const iconName = PROPERTY_TYPE_ICONS[m.type];
        return (
          <Button
            key={m.type}
            variant="ghost"
            onClick={async () => {
              const newProp = {
                ...prop,
                config: DEFAULT_CONFIGS[m.type],
              };
              await changePropertyTypeAsync(prop.id, newProp);
            }}
            style={{
              justifyContent: "flex-start",
              width: "100%",
              gap: 8,
            }}
          >
            <DynamicIcon
              name={iconName}
              className="tiptap-button-icon"
              size={14}
            />
            <span className="tiptap-button-text">{m.label}</span>
            {prop.config.type === m.type && (
              <DynamicIcon
                name="check"
                size={14}
                style={{
                  marginLeft: "auto",
                  color: "var(--tt-brand-color-400)",
                }}
              />
            )}
          </Button>
        );
      })}
    </>
  );
}
