import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useDataSource } from "src/components/tiptap-node/inline-database/hooks/use-data-source";
import { Cell } from "../inline-database/components/cells/cell";
import { PROPERTY_TYPE_ICONS } from "src/components/tiptap-node/inline-database/types/property-type-meta";
import { Button } from "src/components/tiptap-ui-primitive/button";
import type {
  DatabaseProperty,
  DataSourceRecord,
  CellValue,
} from "src/components/tiptap-node/inline-database/types/types";
import "./record-property-panel-node-view.scss";

function PropertyRow({
  prop,
  record,
  onChange,
}: {
  prop: DatabaseProperty;
  record: DataSourceRecord;
  onChange: (value: CellValue | null) => void;
}) {
  const Icon = PROPERTY_TYPE_ICONS[prop.config.type];
  return (
    <div className="record-prop-panel__row">
      <Button variant="ghost" style={{ background: "transparent" }}>
        <Icon size={13} className="tiptap-button-icon" />
        <span className="tiptap-button-text">{prop.name}</span>
      </Button>
      <div className="record-prop-panel__value-wrapper">
        <Cell
          property={prop}
          value={(record.values[prop.id] ?? null) as CellValue | null}
          record={record}
          onChange={onChange}
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
          />
        ))}
      </div>
    </NodeViewWrapper>
  );
}
