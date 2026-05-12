import { SegmentedPicker } from "src/components/tiptap-ui-primitive/segmented-picker";
import type { SegmentedPickerOption } from "src/components/tiptap-ui-primitive/segmented-picker";

export type NumberDisplay = "number" | "bar" | "ring";

const NUMBER_DISPLAY_OPTIONS: SegmentedPickerOption<NumberDisplay>[] = [
  {
    id: "number",
    label: "Number",
    icon: (
      <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
        <text
          x="4"
          y="15"
          fontSize="13"
          fontWeight="600"
          fill="currentColor"
          fontFamily="inherit"
        >
          42
        </text>
      </svg>
    ),
  },
  {
    id: "bar",
    label: "Bar",
    icon: (
      <svg width="36" height="10" viewBox="0 0 36 10" fill="none">
        <rect
          x="0"
          y="3"
          width="36"
          height="4"
          rx="2"
          fill="currentColor"
          opacity="0.2"
        />
        <rect x="0" y="3" width="20" height="4" rx="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "ring",
    label: "Ring",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle
          cx="11"
          cy="11"
          r="8"
          stroke="currentColor"
          strokeWidth="2.5"
          opacity="0.2"
        />
        <path
          d="M11 3 a8 8 0 0 1 6.928 4"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export interface NumberDisplayPickerProps {
  value: NumberDisplay;
  onChange: (value: NumberDisplay) => void;
}

export function NumberDisplayPicker({
  value,
  onChange,
}: NumberDisplayPickerProps) {
  return (
    <SegmentedPicker
      options={NUMBER_DISPLAY_OPTIONS}
      value={value}
      onChange={onChange}
    />
  );
}
