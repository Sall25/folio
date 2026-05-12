import { useRef, useEffect, useCallback } from "react";
import { tokenize } from "./utils/tokenize";

interface FormulaEditorProps {
  value: string;
  onChange: (value: string) => void;
  hasError: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FormulaEditor({
  value,
  onChange,
  hasError,
}: FormulaEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const syncScroll = useCallback(() => {
    if (!textareaRef.current || !highlightRef.current) return;
    highlightRef.current.scrollTop = textareaRef.current.scrollTop;
    highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
  }, []);

  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.innerHTML = tokenize(value) + "<br/>";
    }
  }, [value]);

  return (
    <div
      className={`fp-editor-wrap ${hasError ? "fp-editor-wrap--error" : ""}`}
    >
      {/* Syntax highlight layer */}
      <div ref={highlightRef} className="fp-highlight" aria-hidden />

      {/* Actual textarea (transparent text, caret only) */}
      <textarea
        ref={textareaRef}
        className="fp-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        placeholder="Your formula"
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
    </div>
  );
}
