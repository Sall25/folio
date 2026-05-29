import { useState } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";

interface TextCellDisplayProps {
  value: string | null | undefined;
  onChange?: (value: string) => void;
  placeholder?: string;
}

export function TextCellDisplay({
  value,
  onChange,
  placeholder = "Empty",
}: TextCellDisplayProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  const commit = () => {
    setEditing(false);
    if (onChange && draft !== value) onChange(draft);
  };

  if (editing) {
    return (
      <input
        autoFocus
        className="title-cell-input"
        style={{ width: "100%" }}
        placeholder={placeholder}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value ?? "");
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <Button
      variant="ghost"
      style={{
        background: "transparent",
        width: "100%",
        justifyContent: "flex-start",
        fontFamily:
          'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Display", "Segoe UI", Helvetica, Arial, sans-serif',
        fontSize: 15,
        fontWeight: 400,
        lineHeight: 1.6,
      }}
      onClick={() => {
        setDraft(value ?? "");
        setEditing(true);
      }}
    >
      <span
        className="tiptap-button-text"
        style={{
          color: value ? "var(--tt-theme-text)" : "var(--tt-text-color)",
        }}
      >
        {value || placeholder}
      </span>
    </Button>
  );
}
