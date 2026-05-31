import { Check } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import "./checkbox-cell-display.scss";

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
    <div className="db-cell">
      <Button
        variant="ghost"
        onClick={readonly ? undefined : onChange}
        contentEditable={false}
        aria-checked={value}
        role="checkbox"
        className={`db-checkbox ${value ? "db-checkbox--checked" : ""}`}
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
    </div>
  );
}
