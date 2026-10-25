import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { CaseSensitive, Regex, WholeWord, X } from "src/components/icons";
import { useEditorLayout } from "../context/editor-layout-context";
import { useSearch } from "../search/search-context";
import { isMac } from "src/lib/tiptap-utils";
import { setFindOption, setFindQuery, useFindState } from "src/lib/find-store";
import "./sidebar-search-input.scss";
import { Button } from "src/components/tiptap-ui-primitive/button";

function Toggle({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      className={`fip-toggle${active ? " is-on" : ""}`}
      aria-pressed={active}
      aria-label={label}
      title={label}
      // Keep focus in the input so typing continues after toggling.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

// The sidebar's search bar, always shown under the top row. Typing searches
// inside pages: focusing it swaps the page tree for the results (the find
// panel), with match-case / whole-word / regex toggles and × to go back. At
// rest it shows the Ctrl/⌘+P badge, a button that opens the search palette.
// Esc clears the query, then closes.
export function SidebarSearchInput() {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const { query, options, focusNonce } = useFindState();
  const { sidebarView, setSidebarView } = useEditorLayout();
  const { onOpenChange: openPalette } = useSearch();
  const isOpen = sidebarView === "search";
  const paletteKeys = isMac() ? "⌘P" : "Ctrl+P";
  const paletteLabel = t("find.openPalette", "Open the search palette");

  // Focus only for requests made AFTER mount (Ctrl/⌘+Shift+F) — not because
  // the sidebar re-rendered or re-expanded.
  const handledNonce = useRef(focusNonce);
  useEffect(() => {
    if (focusNonce === handledNonce.current) return;
    handledNonce.current = focusNonce;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [focusNonce]);

  const close = () => {
    setFindQuery("");
    setSidebarView("pages");
    inputRef.current?.blur();
  };

  return (
    <div
      className={`sb-search${isOpen ? " is-open" : ""}`}
      onClick={() => inputRef.current?.focus()}
    >
      <input
        ref={inputRef}
        className="sb-search__input"
        value={query}
        placeholder={t("find.placeholder", "Search in pages…")}
        aria-label={t("find.open", "Search in pages")}
        spellCheck={false}
        onFocus={() => {
          if (!isOpen) setSidebarView("search");
        }}
        onChange={(e) => setFindQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Escape") return;
          e.preventDefault();
          if (query) setFindQuery("");
          else close();
        }}
      />

      {isOpen ? (
        <div className="sb-search__tools">
          <Toggle
            active={options.matchCase}
            label={t("find.matchCase", "Match case")}
            onClick={() => setFindOption("matchCase", !options.matchCase)}
          >
            <CaseSensitive size={14} />
          </Toggle>
          <Toggle
            active={options.wholeWord}
            label={t("find.wholeWord", "Match whole word")}
            onClick={() => setFindOption("wholeWord", !options.wholeWord)}
          >
            <WholeWord size={14} />
          </Toggle>
          <Toggle
            active={options.regex}
            label={t("find.regex", "Use regular expression")}
            onClick={() => setFindOption("regex", !options.regex)}
          >
            <Regex size={14} />
          </Toggle>
          <Button
            type="button"
            className="fip-toggle"
            aria-label={t("find.close", "Close search")}
            title={t("find.close", "Close search")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
          >
            <X className="tiptap-button-icon" size={13} />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          className="sb-search__palette"
          aria-label={`${paletteLabel} (${paletteKeys})`}
          title={paletteLabel}
          onClick={(e) => {
            e.stopPropagation();
            openPalette?.(true);
          }}
        >
          {paletteKeys}
        </button>
      )}
    </div>
  );
}
