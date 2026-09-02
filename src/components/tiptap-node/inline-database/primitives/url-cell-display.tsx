import { useState } from "react";
import { Pencil } from "lucide-react";
import { CellEditorPopover } from "./cell-editor-popover";
import { Input } from "src/components/tiptap-ui-primitive/input";

import "./url-cell-display.scss";

/** Split into domain, separator, and path so each can be styled and truncated independently. */
function splitUrl(url: string): { domain: string; path: string } {
  const bare = url.replace(/^https?:\/\//i, "");
  const slash = bare.indexOf("/");

  return slash === -1
    ? { domain: bare, path: "" }
    : { domain: bare.slice(0, slash), path: bare.slice(slash + 1) };
}

const TAIL_CHARS = 7;

function toHref(url: string): string {
  if (!url) return "";

  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export interface UrlCellDisplayProps {
  value: string;
  onChange: (value: string) => void;
  readonly?: boolean;
  showFullUrl?: boolean;
}

export function UrlCellDisplay({
  value,
  onChange,
  readonly,
  showFullUrl = false,
}: UrlCellDisplayProps) {
  const [draft, setDraft] = useState(value);

  const [prev, setPrev] = useState(value);

  if (value !== prev) {
    setPrev(value);
    setDraft(value);
  }

  const link = value ? (
    (() => {
      // When showFullUrl is enabled, don't split or truncate anything.
      if (showFullUrl) {
        return (
          <a
            href={toHref(value)}
            className="db-cell-link db-cell-link--url"
            onClick={(e) => e.stopPropagation()}
            target="_blank"
            rel="noopener noreferrer"
            title={value}
          >
            {value}
          </a>
        );
      }

      const { domain, path } = splitUrl(value);

      const head = path.length > TAIL_CHARS ? path.slice(0, -TAIL_CHARS) : path;

      const tail = path.length > TAIL_CHARS ? path.slice(-TAIL_CHARS) : "";

      return (
        <a
          href={toHref(value)}
          className="db-cell-link db-cell-link--url"
          onClick={(e) => e.stopPropagation()}
          target="_blank"
          rel="noopener noreferrer"
          title={value}
        >
          <span className="db-cell-link__domain">{domain}</span>

          {path !== "" && <span className="db-cell-link__sep">/</span>}

          {head && <span className="db-cell-link__path-head">{head}</span>}

          {tail && <span className="db-cell-link__path-tail">{tail}</span>}
        </a>
      );
    })()
  ) : (
    <span className="db-cell-link__empty" />
  );

  if (readonly) {
    return <div className="db-td--url">{link}</div>;
  }

  const commit = (close: () => void) => {
    const next = draft.trim();

    if (next !== value) {
      onChange(next);
    }

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
        <Input
          type="url"
          ref={(el) => {
            if (!el) return;

            el.focus();

            const end = el.value.length;

            el.setSelectionRange(end, end);
          }}
          className="db-cell-link__field"
          value={draft}
          placeholder="https://example.com"
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
