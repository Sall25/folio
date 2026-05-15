import { Check } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";

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
    <Button
      variant="ghost"
      className={`db-checkbox ${value ? "db-checkbox--checked" : ""}`}
      onClick={readonly ? undefined : onChange}
      contentEditable={false}
      aria-checked={value}
      role="checkbox"
    >
      {value && (
        <Check
          className="tiptap-button-icon"
          size={11}
          strokeWidth={3}
          style={{ width: 11 }}
        />
      )}
    </Button>
  );
}
