import type { StatusColor } from "./types";

export interface ColorConfig {
  id: StatusColor;
  dot: string;
  bg: string;
  text: string;
}

export const STATUS_COLORS: ColorConfig[] = [
  { id: "gray", dot: "#9b9b9b", bg: "#f1f1ef", text: "#37352f" },
  { id: "blue", dot: "#3b82f6", bg: "#dbeafe", text: "#1e3a8a" },
  { id: "green", dot: "#22c55e", bg: "#dcfce7", text: "#14532d" },
  { id: "orange", dot: "#f97316", bg: "#ffedd5", text: "#7c2d12" },
  { id: "red", dot: "#ef4444", bg: "#fee2e2", text: "#7f1d1d" },
  { id: "purple", dot: "#8b5cf6", bg: "#ede9fe", text: "#3b0764" },
  { id: "yellow", dot: "#eab308", bg: "#fef9c3", text: "#713f12" },
];

export function getColor(id: StatusColor): ColorConfig {
  return STATUS_COLORS.find((c) => c.id === id) ?? STATUS_COLORS[0];
}

export const DEFAULT_GROUPS = [
  {
    id: "todo",
    label: "To-do",
    items: [
      {
        id: "1",
        name: "Not started",
        color: "gray" as StatusColor,
        isDefault: true,
      },
    ],
  },
  {
    id: "inprogress",
    label: "In progress",
    items: [{ id: "2", name: "In progress", color: "blue" as StatusColor }],
  },
  {
    id: "complete",
    label: "Complete",
    items: [{ id: "3", name: "Done", color: "green" as StatusColor }],
  },
];
