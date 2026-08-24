import { iconNames } from "lucide-react/dynamic";

/**
 
  --tt-color-text-lime: hsl(85, 45%, 52%);
  --tt-color-text-mint: hsl(160, 38%, 50%);
  --tt-color-text-teal: hsl(178, 46%, 47%);
  --tt-color-text-cyan: hsl(192, 56%, 53%);
  --tt-color-text-slate: hsl(215, 22%, 60%);
  --tt-color-text-indigo: hsl(240, 50%, 67%);
  --tt-color-text-violet: hsl(262, 50%, 66%);
  --tt-color-text-magenta: hsl(305, 45%, 60%);
  --tt-color-text-rose: hsl(345, 62%, 62%);

 */

export const ICON_COLORS = [
  { name: "Default", value: "var(--icon-default-color)" },
  { name: "Gray", value: "var(--tt-color-text-gray)" },
  { name: "Brown", value: "var(--tt-color-text-brown)" },
  { name: "Orange", value: "var(--tt-color-text-orange)" },
  { name: "Yellow", value: "var(--tt-color-text-yellow)" },
  { name: "Green", value: "var(--tt-color-text-green)" },
  { name: "Blue", value: "var(--tt-color-text-blue)" },
  { name: "Purple", value: "var(--tt-color-text-purple)" },
  { name: "Pink", value: "var(--tt-color-text-pink)" },
  { name: "Red", value: "var(--tt-color-text-red)" },
] as const;

export type IconColor = (typeof ICON_COLORS)[number];
export type IconColorValue = IconColor["value"];
export const DEFAULT_ICON_COLOR = ICON_COLORS[0];

// An entry is just a name + default color. The name is now a Lucide kebab-case
// name ("house", "chevron-right", "file-text") — the same string DynamicIcon
// resolves and page.cover.iconName stores. No component is bundled here; the
// grid draws each cell through DynamicIcon, which lazy-loads one icon at a time.
export type IconEntry = {
  name: string;
  color: IconColorValue;
};

export type IconName = string;

// Built lazily on first call, then cached. `iconNames` is Lucide's own kebab
// list of everything the lazy loader can render, so the picker can never list a
// name DynamicIcon fails to draw.
let _iconList: IconEntry[] | null = null;

export function getIconList(): IconEntry[] {
  if (_iconList) return _iconList;
  _iconList = (iconNames as readonly string[])
    .map((name) => ({ name, color: DEFAULT_ICON_COLOR.value }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return _iconList;
}
