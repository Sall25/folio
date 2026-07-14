import { useState } from "react";
import { Pencil, Phone } from "lucide-react";
import { CellEditorPopover } from "./cell-editor-popover";
import { AutoTextarea } from "./auto-textarea";
import "./phone-cell-display.scss";

export interface PhoneCellDisplayProps {
  value: string;
  onChange: (value: string) => void;
  readonly?: boolean;
}

/**
 * Phone cell — a tel: link with the same click-vs-edit split as email and url:
 * clicking the number dials it, clicking the space beside it (marked by the
 * pencil) opens the editor.
 *
 * The number is stored and displayed EXACTLY as typed. No auto-formatting:
 * phone numbers are internationally messy (+221 77 123 4567, (555) 123-4567,
 * 07700 900123), and any formatter mangles some region's convention. Notion
 * takes the same position.
 */
export function PhoneCellDisplay({
  value,
  onChange,
  readonly,
}: PhoneCellDisplayProps) {
  const [draft, setDraft] = useState(value);

  // Adopt external changes while idle (popover closed).
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setDraft(value);
  }

  const link = value ? (
    <a
      // Strip spaces and punctuation for the href only — the DISPLAY keeps the
      // user's formatting. tel: is whitespace-sensitive in some dialers.
      href={`tel:${value.replace(/[^\d+]/g, "")}`}
      className="db-cell-phone__link"
      onClick={(e) => e.stopPropagation()}
    >
      <Phone size={11} />
      <span className="db-cell-phone__text">{value}</span>
    </a>
  ) : (
    <span className="db-cell-phone__empty" />
  );

  if (readonly) return <div className="db-td--phone">{link}</div>;

  const commit = (close: () => void) => {
    const next = draft.trim();
    if (next !== value) onChange(next);
    close();
  };

  return (
    <CellEditorPopover
      trigger={
        <div className="db-td--phone">
          {link}
          <span className="db-cell-edit-hint" aria-hidden="true">
            <Pencil size={12} />
          </span>
        </div>
      }
    >
      {(close) => (
        <AutoTextarea
          className="db-cell-phone__field"
          value={draft}
          maxRows={1}
          placeholder="+221 77 123 4567"
          onChange={setDraft}
          onBlur={() => commit(close)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(close);
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setDraft(value);
              close();
            }
          }}
        />
      )}
    </CellEditorPopover>
  );
}
