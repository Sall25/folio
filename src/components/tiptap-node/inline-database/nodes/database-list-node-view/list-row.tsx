import { Cell } from "../../components/cells/cell";
import type {
  DatabaseProperty,
  CellValue,
  DatabaseView,
  Page,
  ID,
  PropertyType,
} from "src/types";
import "./database-list-node-view.scss";
import { memo, useCallback } from "react";

function ListRowImpl({
  record,
  inlineProperties,
  titleProp,
  onChange,
  view,
  columnValuesByProp,
}: {
  record: Page;
  inlineProperties: DatabaseProperty[];
  titleProp: DatabaseProperty | undefined;
  onChange: (rec: Page, propId: ID, v: CellValue<PropertyType>) => void;
  view: DatabaseView;
  columnValuesByProp: Record<string, CellValue[]>;
}) {
  const onCellChange = useCallback(
    (v: CellValue) => {
      if (!titleProp) return;
      onChange(record, titleProp.id, v);
    },
    [onChange, titleProp, record],
  );

  return (
    <div className="db-list-row">
      <div className="db-list-row__title">
        {titleProp && (
          <Cell
            property={titleProp}
            value={(record.values?.[titleProp.id] ?? null) as CellValue | null}
            record={record}
            onChange={onCellChange}
            view={view}
            properties={inlineProperties}
            columnValues={columnValuesByProp[titleProp.id]}
          />
        )}
      </div>

      <div className="db-list-row__props">
        {inlineProperties.map((prop) => (
          <Cell
            key={prop.id}
            property={prop}
            value={(record.values?.[prop.id] ?? null) as CellValue | null}
            record={record}
            onChange={onCellChange}
            view={view}
            properties={inlineProperties}
            columnValues={columnValuesByProp[prop.id]}
          />
        ))}
      </div>
    </div>
  );
}

export const ListRow = memo(ListRowImpl);
