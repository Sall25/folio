import { MATERIAL_ICON_NAMES } from "./material-icon-names.js";

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

// An entry is now just a name + default color — no bundled component. The name
// is a Material Symbols ligature ("home", "chevron_right"), drawn by the font.
export type IconEntry = {
  name: string;
  color: IconColorValue;
};

export type IconName = string;

// Built lazily on first call, then cached. Unlike the Lucide version this no
// longer enumerates a component library — it maps the static verified name list
// to entries. The font itself is the lazily-loaded asset (see index.html).
let _iconList: IconEntry[] | null = null;

export function getIconList(): IconEntry[] {
  if (_iconList) return _iconList;
  _iconList = MATERIAL_ICON_NAMES.map((name) => ({
    name,
    color: DEFAULT_ICON_COLOR.value,
  })).sort((a, b) => a.name.localeCompare(b.name));
  return _iconList;
}
