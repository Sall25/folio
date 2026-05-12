export interface FormulaProperty {
  id: string;
  name: string;
  type: PropertyType;
}

export type PropertyType =
  | "text"
  | "person"
  | "date"
  | "number"
  | "checkbox"
  | "created_by"
  | "created_time"
  | "edited_by"
  | "edited_time";

export interface BuiltinFunction {
  name: string;
  category: BuiltinCategory;
  signature: string;
  description: string;
  example?: string;
}

export type BuiltinCategory =
  | "logic"
  | "text"
  | "number"
  | "date"
  | "array";

export interface FormulaPropertyProps {
  properties?: FormulaProperty[];
  formula?: string;
  onChange?: (formula: string) => void;
  onClose?: () => void;
}

export interface FormulaPreviewResult {
  output: string | null;
  type: string;
  error: string | null;
}
