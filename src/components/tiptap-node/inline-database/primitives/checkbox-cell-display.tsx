import { Check } from "lucide-react";

interface CheckboxCellDisplayProps {
  value: boolean;
  onChange?: () => void;
  readonly?: boolean;
}

export function CheckboxCellDisplay({
  value,
  onChange,
  readonly = false,
}: CheckboxCellDisplayProps) {
  return (
    <button
      className={`db-checkbox ${value ? "db-checkbox--checked" : ""}`}
      onClick={readonly ? undefined : onChange}
      contentEditable={false}
      aria-checked={value}
      role="checkbox"
    >
      {value && <Check size={11} strokeWidth={3} />}
    </button>
  );
}
