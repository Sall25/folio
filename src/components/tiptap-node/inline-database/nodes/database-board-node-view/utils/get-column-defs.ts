import type { CellValue, DatabaseProperty } from "src/types";

export interface ColumnDef {
  id: string;
  label: string;
  color?: string;
  value?: CellValue;
}

export function getColumnDefs(prop: DatabaseProperty | undefined): ColumnDef[] {
  if (!prop) return [];
  const config = prop.config;

  if (config.type === "select" || config.type === "multi_select") {
    return config.options.map((o) => ({
      id: o.id,
      label: o.label,
      color: o.color,
      value: o,
    }));
  }

  if (config.type === "status") {
    return config.groups.flatMap((g) =>
      g.items.map((i) => ({
        id: i.id,
        label: i.name,
        color: i.color,
        value: i.id, //g.id,
      })),
    );
  }

  if (config.type === "checkbox") {
    return [
      { id: "true", label: "Checked", value: true },
      { id: "false", label: "Unchecked", value: false },
    ];
  }

  return [];
}
