import { useState, forwardRef, type ChangeEvent, useRef } from "react";
import { useAutosize } from "./use-autosize";
import "src/components/tiptap-ui-primitive/input/input.scss";
import "./textarea-auto-size.scss";

interface TextareaAutosizeProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
  maxRows?: number;
  value?: string;
  defaultValue?: string;
  onChange?: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  /** Optional chrome — omitted entirely when unset, so the bare control can
   *  drop into tight spaces (cell editors, toolbars) without wrapper divs. */
  label?: string;
  hint?: string;
  error?: string;
  /** Character count, off by default — it was leaking into every embedded use. */
  showCount?: boolean;
  disabled?: boolean;
  className?: string;
  autoFocusEnd?: boolean;
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
    showCount = false,
    disabled = false,
    className,
    autoFocusEnd = true,
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

  // Whether any of the optional chrome is present. When none is, the component
  // renders the bare control — no wrapper divs to fight the container's sizing
  // in tight spaces like cell editors.
  const hasChrome = !!(label || hint || error);

  const focusedRef = useRef(false);

  // Shares the Input primitive's class so both controls inherit the same
  // tokens, border, placeholder, focus ring and dark-mode handling. The
  // --textarea modifier relaxes the fixed height, which is the only thing
  // that can't carry over from a single-line control.
  const control = (
    <>
      <textarea
        ref={(el) => {
          shadowRef.current = el;
          if (el && autoFocusEnd && !focusedRef.current) {
            focusedRef.current = true;
            el.focus();
            const end = el.value.length;
            el.setSelectionRange(end, end);
          }
        }}
        aria-hidden="true"
        tabIndex={-1}
        className="tiptap-input tiptap-input--textarea ta-shadow"
        readOnly
      />
      <textarea
        ref={(el) => {
          textareaRef(el);

          if (el && autoFocusEnd && !focusedRef.current) {
            focusedRef.current = true;
            el.focus();
            const end = el.value.length;
            el.setSelectionRange(end, end);
          }
        }}
        className={`tiptap-input tiptap-input--textarea ta-input${
          error ? " tiptap-input--error" : ""
        }${!hasChrome && className ? ` ${className}` : ""}`}
        value={value}
        onChange={handleChange}
        onInput={sync}
        placeholder={placeholder}
        disabled={disabled}
        rows={minRows}
        aria-invalid={!!error}
        {...rest}
      />
      {showCount && (
        <div className="ta-corner">
          <span className="ta-char-count">{value.length}</span>
        </div>
      )}
    </>
  );

  // Bare control when there's no label/hint/error — no wrapper divs to fight
  // the container's sizing.
  if (!hasChrome) {
    return <div className="ta-field">{control}</div>;
  }

  return (
    <div className={`ta-wrapper ${className ?? ""}`} data-disabled={disabled}>
      {label && <label className="ta-label">{label}</label>}
      <div className="ta-field">{control}</div>
      {(hint || error) && (
        <p className={`ta-hint ${error ? "ta-hint--error" : ""}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
});
