import { useState, forwardRef, type ChangeEvent } from "react";
import { useAutosize } from "./use-autosize";
import "./textarea-auto-size.scss";

interface TextareaAutosizeProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
  maxRows?: number;
  value?: string;
  defaultValue?: string;
  onChange?: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  label?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export const TextareaAutosize = forwardRef<
  HTMLTextAreaElement,
  TextareaAutosizeProps
>(function TextareaAutosize(
  {
    minRows = 1,
    maxRows = Infinity,
    value: controlledValue,
    defaultValue = "",
    onChange,
    placeholder = "Start typing...",
    label,
    hint,
    error,
    disabled = false,
    className,
    ...rest
  },
  forwardedRef,
) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const value = isControlled ? controlledValue : internalValue;

  const { textareaRef, shadowRef, sync } = useAutosize({
    minRows,
    maxRows,
    value,
    externalRef: forwardedRef,
  });

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (!isControlled) setInternalValue(e.target.value);
    onChange?.(e);
  };

  return (
    <div className={`ta-wrapper ${className ?? ""}`} data-disabled={disabled}>
      {label && <label className="ta-label">{label}</label>}

      <div className={`ta-field ${error ? "ta-field--error" : ""}`}>
        <textarea
          ref={shadowRef}
          aria-hidden="true"
          tabIndex={-1}
          className="ta-shadow"
          readOnly
        />

        <textarea
          ref={textareaRef}
          className="ta-input"
          value={value}
          onChange={handleChange}
          onInput={sync}
          placeholder={placeholder}
          disabled={disabled}
          rows={minRows}
          aria-invalid={!!error}
          {...rest}
        />

        <div className="ta-corner">
          <span className="ta-char-count">{value.length}</span>
        </div>
      </div>

      {(hint || error) && (
        <p className={`ta-hint ${error ? "ta-hint--error" : ""}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
});
