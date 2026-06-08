import {
  useRef,
  useState,
  useLayoutEffect,
  useCallback,
  type CSSProperties,
} from "react";
import "./editable-text.scss";

export interface EditableTextProps {
  value: string;
  /** Fired on blur / Enter (single-line) — i.e. when the edit "commits". */
  onChange: (value: string) => void;
  /** Optional live callback on every keystroke (for callers that want it). */
  onInput?: (value: string) => void;
  placeholder?: string;
  /** Wrap + grow to multiple lines (title). false = single visual line. */
  multiline?: boolean;
  readonly?: boolean;
  autoFocus?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Enter commits & blurs in single-line mode; in multiline it inserts a
   *  newline unless this is true. */
  enterCommits?: boolean;
}

/**
 * Notion-style always-editable text field. It's a real <textarea> at all
 * times — no display/edit mode flip — styled to look like plain text until
 * focused. Auto-grows with content when `multiline`. Reused by the title cell
 * and the text cell.
 */
export function EditableText({
  value,
  onChange,
  onInput,
  placeholder = "Untitled",
  multiline = false,
  readonly = false,
  autoFocus = false,
  className,
  style,
  enterCommits,
}: EditableTextProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);

  // Sync external value into the draft only while NOT focused. This replaces
  // the focused-ref hack: an external update (rename elsewhere, server echo)
  // is adopted when the field is idle, but never clobbers what you're typing.
  const [prevValue, setPrevValue] = useState(value);
  if (!focused && value !== prevValue) {
    setPrevValue(value);
    setDraft(value);
  }

  // Auto-grow: match the textarea height to its content (multiline only).
  const resize = useCallback(() => {
    const el = ref.current;
    if (!el || !multiline) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [multiline]);

  useLayoutEffect(() => {
    resize();
  }, [draft, resize]);

  const commit = useCallback(() => {
    if (draft !== value) onChange(draft);
  }, [draft, value, onChange]);

  const commitsOnEnter = enterCommits ?? !multiline;

  return (
    <textarea
      ref={ref}
      className={`editable-text${multiline ? " editable-text--multiline" : ""}${
        className ? ` ${className}` : ""
      }`}
      style={style}
      rows={1}
      value={draft}
      placeholder={placeholder}
      readOnly={readonly}
      autoFocus={autoFocus}
      spellCheck={false}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        setDraft(e.target.value);
        onInput?.(e.target.value);
      }}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && commitsOnEnter) {
          e.preventDefault();
          commit();
          ref.current?.blur();
        }
        if (e.key === "Escape") {
          setDraft(value); // revert
          ref.current?.blur();
        }
      }}
    />
  );
}
