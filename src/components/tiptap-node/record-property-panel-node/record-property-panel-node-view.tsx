import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { createElement } from "react";
import { Type as UltimateFallbackIcon, type LucideIcon } from "lucide-react";
import { useDataSource } from "src/components/tiptap-node/inline-database/hooks/use-data-source";
import { Cell } from "../inline-database/components/cells/cell";
import { PROPERTY_TYPE_ICONS } from "src/components/tiptap-node/inline-database/types/property-type-meta";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { ICON_LIST } from "src/components/tiptap-ui/cover/data/icon-list.js";
import type {
  DatabaseProperty,
  DataSourceRecord,
  CellValue,
} from "src/components/tiptap-node/inline-database/types/types";
import "./record-property-panel-node-view.scss";

// name -> Lucide component, so a stored `prop.icon` string can be rendered.
const ICON_MAP = new Map<string, LucideIcon>(
  (ICON_LIST ?? []).map((e) => [e.name, e.icon]),
);

// Resolve a property's icon to a Lucide component: custom prop.icon name first,
// then the type's default icon, then a final fallback. Rendered via
// createElement on a lowercase binding so the component is never "created
// during render".
function PropertyIcon({
  prop,
  color,
  ...rest
}: {
  prop: DatabaseProperty;
  color?: string;
} & React.ComponentProps<LucideIcon>) {
  const resolved =
    (prop.icon && ICON_MAP.get(prop.icon)) ||
    PROPERTY_TYPE_ICONS[prop.config.type] ||
    UltimateFallbackIcon;
  // Only pass `color` when set — color:undefined would override lucide's
  // default stroke="currentColor" and the icon would render invisible.
  return createElement(resolved, color ? { color, ...rest } : { ...rest });
}

function PropertyRow({
  prop,
  properties,
  record,
  onChange,
}: {
  prop: DatabaseProperty;
  properties: DatabaseProperty[];
  record: DataSourceRecord;
  onChange: (value: CellValue | null) => void;
}) {
  return (
    <div className="record-prop-panel__row">
      <Button variant="ghost" style={{ background: "transparent" }}>
        <PropertyIcon
          prop={prop}
          color={prop.iconColor}
          size={13}
          className="tiptap-button-icon"
        />
        <span className="tiptap-button-text">{prop.name}</span>
      </Button>
      <div className="record-prop-panel__value-wrapper">
        <Cell
          property={prop}
          value={(record.values[prop.id] ?? null) as CellValue | null}
          record={record}
          onChange={onChange}
          properties={properties}
        />
      </div>
    </div>
  );
}

export function RecordPropertyPanelView({ node }: NodeViewProps) {
  // databaseId here is the data source id (the db node's sourceId)
  const { sourceId, recordId } = node.attrs as {
    sourceId: string | null;
    recordId: string | null;
    pageId: number | null;
  };

  const { source, isLoading, setCellValue } = useDataSource(sourceId);
  if (!sourceId || !recordId) return <NodeViewWrapper />;
  if (isLoading || !source) return <NodeViewWrapper />;
  const record = source.records.find((r) => r.id === recordId);

  if (!record) return <NodeViewWrapper />;

  const properties = source.properties.filter((p) => p.config.type !== "title");
  if (properties.length === 0) return <NodeViewWrapper />;

  return (
    <NodeViewWrapper contentEditable={false}>
      <div className="record-prop-panel">
        {properties.map((prop) => (
          <PropertyRow
            key={prop.id}
            prop={prop}
            record={record}
            onChange={(v) => setCellValue(record.id, prop.id, v)}
            properties={properties}
          />
        ))}
      </div>
    </NodeViewWrapper>
  );
}
