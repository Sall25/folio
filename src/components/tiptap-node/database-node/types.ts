export type PropertyType =
  | "text"
  | "select"
  | "date"
  | "number"
  | "checkbox"
  | "url";

export interface SelectOption {
  label: string;
  color?: string;
}

export interface Property {
  id: string;
  label: string;
  type: PropertyType;
  options?: SelectOption[];
  visible: boolean;
  width?: string;
}

export interface DatabaseRow {
  id: string;
  [key: string]: string | number | boolean;
}

export type SortDirection = "asc" | "desc";

export interface Sort {
  prop: string;
  dir: SortDirection;
}

export type FilterOperator =
  | "contains"
  | "is"
  | "is_not"
  | "is_empty"
  | "is_not_empty";

export interface Filter {
  id: string;
  prop: string;
  op: FilterOperator;
  val: string;
}

export interface DatabaseAttrs {
  id: string;
  title: string;
  properties: Property[];
  rows: DatabaseRow[];
  sorts: Sort[];
  filters: Filter[];
  groupBy: string | null;
}
