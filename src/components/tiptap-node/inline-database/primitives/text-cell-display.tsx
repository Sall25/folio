import { useState } from "react";
import { TextareaAutosize } from "src/components/tiptap-ui-primitive/textarea-auto-size";
import { CellEditorPopover } from "./cell-editor-popover";
import "./text-cell-display.scss";

interface TextCellDisplayProps {
  value: string | null | undefined;
  onChange?: (value: string) => void;
  placeholder?: string;
  readonly?: boolean;
}

export function TextCellDisplay({
  value,
  onChange,
  placeholder = "Empty",
  readonly,
}: TextCellDisplayProps) {
  const text = value ?? "";
  const [draft, setDraft] = useState(text);

  // adopt external changes when idle (popover closed)
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
          className="db-cell-text__field"
          autoFocus
          placeholder={placeholder}
          value={draft}
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(close)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              commit(close);
            }
            if (e.key === "Escape") {
              setDraft(text);
              close();
            }
          }}
        />
      )}
    </CellEditorPopover>
  );
}
