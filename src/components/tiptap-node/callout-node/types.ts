export type CalloutColor =
  | "gray"
  | "brown"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "red";

export interface CalloutAttrs {
  emoji: string;
  color: CalloutColor;
}

export interface CalloutColorConfig {
  id: CalloutColor;
  label: string;
  theme: { bg: string; border: string };
}
