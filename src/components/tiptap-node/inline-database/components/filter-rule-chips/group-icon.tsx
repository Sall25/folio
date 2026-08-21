import {
  Circle,
  CircleDashed,
  CircleDotDashed,
  CircleCheck,
} from "lucide-react";
import {
  colorForGroup,
  getColor,
} from "../../ui/status/status-edit-display/config";
import type { StatusGroup } from "src/types";

// The semantic icon for a status group, keyed by the group's id (the three
// canonical groups). User-created groups fall back to a neutral dashed circle.
export function GroupIcon({ group }: { group: StatusGroup }) {
  const color = getColor(colorForGroup(group)).dot; // the group's dot color

  const Icon =
    group.id === "g1" // g1 = todo
      ? CircleDashed // hollow/dotted — not started
      : group.id === "g2" // g2 = inprogress
        ? CircleDotDashed // partial — in progress
        : group.id === "g3" // g3 = complete
          ? CircleCheck // filled check — done
          : Circle; // fallback for custom groups

  return (
    <Icon
      className="tiptap-button-icon"
      size={16}
      style={{ color }}
      strokeWidth={2}
    />
  );
}
