import type {
  CellValue,
  ConfigOf,
  DatabaseProperty,
  PropertyType,
} from "src/types";

export interface CellProps<T extends PropertyType = PropertyType> {
  value: CellValue<T> | null;
  config: ConfigOf<T>;
  onChange: (value: CellValue<T> | null) => void;
  columnValues?: CellValue<T>[];
  readonly?: boolean;
  unwrapped?: boolean;
  property?: DatabaseProperty;
  className?: string;
}
