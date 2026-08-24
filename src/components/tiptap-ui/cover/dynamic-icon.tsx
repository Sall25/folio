import { memo } from "react";
import {
  DynamicIcon as LucideDynamicIcon,
  iconNames,
} from "lucide-react/dynamic";

// `lucide-react/dynamic` lazily imports a single icon by its kebab-case name,
// so nothing here pulls the whole Lucide namespace into the eager bundle — the
// page-header icon stays a one-icon fetch. `iconNames` is the full kebab list,
// used for O(1) validation so an unknown/removed name renders the fallback
// instead of nothing.
const VALID = new Set<string>(iconNames as readonly string[]);

// Legacy semantic keys still passed in by the database property panels and a
// couple of buttons (these were the old Material ligature names) → their Lucide
// kebab equivalents. Anything not in here is assumed to already be a Lucide
// name (that's what the icon picker now stores).
const ALIASES: Record<string, string> = {
  match_case: "case-sensitive",
  notes: "align-left",
  tag: "hash",
  check_box: "square-check",
  expand_circle_down: "circle-chevron-down",
  list: "list",
  arrow_upload_progress: "loader-circle",
  calendar_today: "calendar",
  person: "user",
  functions: "square-function",
  sync_alt: "arrow-left-right",
  swap_vert: "arrow-up-down",
  link: "link",
  call: "phone",
  mail: "mail",
  schedule: "clock",
  person_add: "user-plus",
  edit: "pencil",
  delete: "trash-2",
};

const FALLBACK = "file-text";

function resolve(name?: string): string {
  if (!name) return FALLBACK;
  const mapped = ALIASES[name] ?? name;
  return VALID.has(mapped) ? mapped : FALLBACK;
}

function DynamicIconImpl({
  name,
  size = 16,
  className,
  style,
}: {
  name?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  weight?: number; // ignored (was a Material font axis)
  filled?: boolean; // ignored (was a Material font axis)
}) {
  return (
    <LucideDynamicIcon
      // Validated against `iconNames` above; the cast just satisfies the
      // IconName string-literal union.
      name={resolve(name) as never}
      size={size}
      className={className}
      style={style}
    />
  );
}

export const DynamicIcon = memo(DynamicIconImpl);
