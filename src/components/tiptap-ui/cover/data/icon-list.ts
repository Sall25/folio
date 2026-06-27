import type { LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";

export const ICON_COLORS = [
  { name: "Default", value: "var(--icon-default-color)" },
  { name: "Gray", value: "#888780" },
  { name: "Brown", value: "#9f6b53" },
  { name: "Orange", value: "#d9730d" },
  { name: "Yellow", value: "#cb912f" },
  { name: "Green", value: "#448361" },
  { name: "Blue", value: "#337ea9" },
  { name: "Purple", value: "#9065b0" },
  { name: "Pink", value: "#c14a8a" },
  { name: "Red", value: "#d44c47" },
] as const;

export type IconColor = (typeof ICON_COLORS)[number];
export type IconColorValue = IconColor["value"];
export const DEFAULT_ICON_COLOR = ICON_COLORS[0];

export type IconEntry = {
  name: string;
  icon: LucideIcon;
  color: IconColorValue;
};

export type IconName = string;

export const ICON_LIST: IconEntry[] = Object.entries(LucideIcons)
  .filter(
    ([name, value]) =>
      /^[A-Z]/.test(name) &&
      !name.endsWith("Icon") &&
      typeof value === "object",
  )
  .map(([name, icon]) => ({
    name,
    icon: icon as LucideIcon,
    color: DEFAULT_ICON_COLOR.value,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));
