import { memo, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import type { UseDatabaseReturn } from "../../hooks/use-database";
import { Input } from "src/components/tiptap-ui-primitive/input";
import { useDebouncedCallback } from "use-debounce";
import "./search-button.scss";

// Shared style for the small square control buttons (search/filter/sort).
const CONTROL_BUTTON_STYLE: React.CSSProperties = {
  minHeight: 22,
  height: 22,
  borderRadius: "var(--tt-radius-sm)",
  background: "transparent",
};

// ── search (already extracted; unchanged) ────────────────────────────────────
function SearchButtonImpl({ db }: { db: UseDatabaseReturn }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(db.searchQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  const pushQuery = useDebouncedCallback(
    (q: string) => db.setSearchQuery(q),
    200,
    { maxWait: 600 },
  );

  const clear = () => {
    setDraft("");
    pushQuery.cancel();
    db.setSearchQuery("");
  };

  const close = () => {
    clear();
    setOpen(false);
  };

  // Focus the field when it expands.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Collapsed: just the icon button.
  if (!open) {
    return (
      <Button
        variant="ghost"
        tooltip="Search"
        data-active-state={db.searchQuery ? "on" : "off"}
        style={CONTROL_BUTTON_STYLE}
        onClick={() => setOpen(true)}
      >
        <Search size={14} className="tiptap-button-icon" />
      </Button>
    );
  }

  // Expanded: inline search field in the toolbar row.
  return (
    <div className="db-search db-search--inline">
      <Search size={14} className="db-search__icon" />
      <Input
        ref={inputRef}
        className="db-search__input"
        placeholder="Type to search..."
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          pushQuery(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            close();
          }
          if (e.key === "Enter") {
            e.preventDefault();
            pushQuery.flush();
          }
        }}
        onBlur={() => {
          // Collapse when focus leaves AND there's no active query — keeps the
          // field open if the user has typed something, closes it if empty.
          if (!draft) close();
        }}
      />
      {draft && (
        <Button
          variant="ghost"
          className="db-search__clear"
          onClick={clear}
          aria-label="Clear search"
        >
          <X size={13} className="tiptap-button-icon" />
        </Button>
      )}
    </div>
  );
}

export const SearchButton = memo(SearchButtonImpl);
