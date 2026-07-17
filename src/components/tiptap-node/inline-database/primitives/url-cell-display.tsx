import { useState } from "react";
import { ExternalLink, Pencil } from "lucide-react";
import { CellEditorPopover } from "./cell-editor-popover";
import { AutoTextarea } from "./auto-textarea";
import "./url-cell-display.scss";

function toHref(url: string): string {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export interface UrlCellDisplayProps {
  value: string;
  onChange: (value: string) => void;
  readonly?: boolean;
}

export function UrlCellDisplay({
  value,
  onChange,
  readonly,
}: UrlCellDisplayProps) {
  const [draft, setDraft] = useState(value);

  // Adopt external changes while idle (popover closed).
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setDraft(value);
  }

  // The link stops propagation, so clicking the URL itself opens it. That means
  // a click can only reach the EDITOR via the space beside the link — which is
  // invisible dead space unless it's signposted. Hence the pencil: it marks the
  // one spot that edits rather than navigates.
  const link = value ? (
    <a
      href={toHref(value)}
      className="db-cell-link db-cell-link--url"
      onClick={(e) => e.stopPropagation()}
      target="_blank"
      rel="noopener noreferrer"
    >
      <ExternalLink stroke="var(--tt-text-primary)" size={11} />
      <span className="db-cell-link__text">{value}</span>
    </a>
  ) : (
    <span className="db-cell-link__empty" />
  );

  if (readonly) return <div className="db-td--url">{link}</div>;

  const commit = (close: () => void) => {
    const next = draft.trim();
    if (next !== value) onChange(next);
    close();
  };

  return (
    <CellEditorPopover
      trigger={
        <div className="db-td--url">
          {link}
          <span className="db-cell-edit-hint" aria-hidden="true">
            <Pencil size={12} />
          </span>
        </div>
      }
    >
      {(close) => (
        <AutoTextarea
          className="db-cell-link__field"
          value={draft}
          maxRows={1}
          placeholder="https://example.com"
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
