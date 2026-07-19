import { useState } from "react";
import { CellEditorPopover } from "./cell-editor-popover";
import "./email-cell-display.scss";
import { Pencil } from "lucide-react";
import { Input } from "src/components/tiptap-ui-primitive/input";

export interface EmailCellDisplayProps {
  value: string;
  onChange: (value: string) => void;
  readonly?: boolean;
}

export function EmailCellDisplay({
  value,
  onChange,
  readonly,
}: EmailCellDisplayProps) {
  const [draft, setDraft] = useState(value);

  // Adopt external changes while idle (popover closed).
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setDraft(value);
  }

  // The link stops propagation so clicking the address itself opens the mail
  // client, while clicking anywhere else in the cell opens the editor. That's
  // Notion's behaviour, and it's why the trigger isn't simply "the whole cell
  // opens the editor".
  const link = value ? (
    <a
      href={`mailto:${value}`}
      className="db-cell-email__link"
      onClick={(e) => e.stopPropagation()}
    >
      {value}
    </a>
  ) : (
    <span className="db-cell-email__empty" />
  );

  const display = (
    <div className="db-td--email">
      {link}
      {/* The click zone, made visible. The link stops propagation (so clicking
          the address opens the mail client), which means this is the ONLY place
          a click reaches the editor — worth signposting rather than leaving as
          invisible dead space. */}
      {!readonly && (
        <span className="db-cell-edit-hint" aria-hidden="true">
          <Pencil size={12} />
        </span>
      )}
    </div>
  );
  if (readonly) return <div className="db-td--email">{link}</div>;

  const commit = (close: () => void) => {
    const next = draft.trim();
    if (next !== value) onChange(next);
    close();
  };

  return (
    <CellEditorPopover trigger={display}>
      {(close) => (
        <Input
          // NOT type="email": setSelectionRange throws on email inputs (the
          // spec only permits selection APIs on text/search/url/tel/password).
          // inputMode gets the right mobile keyboard without that restriction.
          type="text"
          inputMode="email"
          ref={(el) => {
            if (!el) return;
            el.focus();
            const end = el.value.length;
            el.setSelectionRange(end, end);
          }}
          className="db-cell-email__field"
          value={draft}
          placeholder="example@email.com"
          onChange={(e) => setDraft(e.target.value)}
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
