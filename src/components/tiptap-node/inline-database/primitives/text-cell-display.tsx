import { useState } from "react";
import { CellEditorPopover } from "./cell-editor-popover";
import "./text-cell-display.scss";
import { TextareaAutosize } from "src/components/tiptap-ui-primitive/textarea-auto-size";

interface TextCellDisplayProps {
  value: string | null | undefined;
  onChange?: (value: string) => void;
  placeholder?: string;
  readonly?: boolean;
  maxRows?: number;
}

export function TextCellDisplay({
  value,
  onChange,
  placeholder = "Empty",
  readonly,
  // maxRows = 8,
}: TextCellDisplayProps) {
  const text = value ?? "";
  const [draft, setDraft] = useState(text);

  // Adopt external changes while idle (popover closed).
  const [prev, setPrev] = useState(text);
  if (text !== prev) {
    setPrev(text);
    setDraft(text);
  }

  const commit = (close: () => void) => {
    if (onChange && draft !== text) onChange(draft);
    close();
  };

  return (
    <CellEditorPopover
      readonly={readonly || !onChange}
      // Match the column exactly — the default adds 8px, which spills the box
      // past the cell edge.
      width="calc(var(--radix-popover-trigger-width) + 8px)"
      minHeight="calc(var(--radix-popover-trigger-height) + 8px)"
      trigger={
        <span
          className={`db-cell-text__display${
            value ? "" : " db-cell-text__display--empty"
          }`}
        >
          {value || placeholder}
        </span>
      }
    >
      {(close) => (
        <TextareaAutosize
          autoFocusEnd
          className="db-cell-text__field"
          value={draft}
          // maxRows={maxRows}
          placeholder={placeholder}
          // Event-based, unlike AutoTextarea which handed back a string.
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(close)}
          onKeyDown={(e) => {
            // Enter commits; Shift+Enter inserts a newline.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              commit(close);
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setDraft(text);
              close();
            }
          }}
        />
      )}
    </CellEditorPopover>
  );
}
