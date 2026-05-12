import "./segmented-picker.scss";
import type { SegmentedPickerProps } from "./types";

export function SegmentedPicker<T extends string>({
  options,
  value,
  onChange,
}: SegmentedPickerProps<T>) {
  return (
    <div className="seg-picker">
      {options.map((option) => (
        <button
          key={option.id}
          className={`seg-picker__option ${value === option.id ? "seg-picker__option--active" : ""}`}
          onClick={() => onChange(option.id)}
          type="button"
        >
          <span className="seg-picker__icon">{option.icon}</span>
          <span className="seg-picker__label">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
