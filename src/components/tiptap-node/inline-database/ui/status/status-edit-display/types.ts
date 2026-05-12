export type StatusColor =
  | "gray"
  | "blue"
  | "green"
  | "orange"
  | "red"
  | "purple"
  | "yellow";

export interface StatusItem {
  id: string;
  name: string;
  color: StatusColor;
  isDefault?: boolean;
}

export interface StatusGroup {
  id: string;
  label: string;
  items: StatusItem[];
}

export interface StatusPropertyProps {
  groups?: StatusGroup[];
  onChange?: (groups: StatusGroup[]) => void;
}
