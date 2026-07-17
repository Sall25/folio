import { useLayoutEffect, useRef } from "react";

export interface AutoTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  /** Stop growing past this many lines; scroll after that. */
  maxRows?: number;
  className?: string;
}

/**
 * A bare auto-growing textarea for the cell editors.
 *
 * Deliberately NOT the TextareaAutosize primitive: that one renders a wrapper +
 * field + shadow textarea + a character counter, and the className lands on the
 * WRAPPER — so styling never reaches the real <textarea>, which keeps its own
 * padding and metrics. That made the text visibly shift the moment the editor
 * opened, and put a stray character count in the corner of the cell. Here the
 * class lands on the element itself, so its metrics can be matched to the cell's
 * display exactly.
 *
 * Two layout effects, deliberately separate:
 *   - grow: runs on every value change, sizing the box to its content
 *   - focus: runs ONCE on mount, putting the caret at the end
 *
 * Both are useLayoutEffect rather than useEffect so they land before paint —
 * the box never renders at the wrong height, and the caret never flashes at
 * position 0.
 */
export function AutoTextarea({
  value,
  onChange,
  onBlur,
  onKeyDown,
  placeholder,
  maxRows = 8,
  className,
}: AutoTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Grow to fit the content, capped at maxRows.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.height = "auto"; // collapse first, or it can only ever grow
    const lineHeight =
      parseFloat(getComputedStyle(el).lineHeight || "21") || 21;
    const max = lineHeight * maxRows;
    const next = Math.min(el.scrollHeight, max);

    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, [value, maxRows]);

  // Focus with the caret at the END. autoFocus would land it at position 0, so
  // clicking into a filled cell would put the cursor before the text.
  //
  // Mount only: re-running this on every value change would yank the caret to
  // the end while the user is typing mid-string.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }, []);

  return (
    <textarea
      ref={ref}
      className={className}
      rows={1}
      spellCheck={false}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    />
  );
}
