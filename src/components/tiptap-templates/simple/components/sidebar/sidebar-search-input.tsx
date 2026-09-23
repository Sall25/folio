import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { CaseSensitive, Regex, Search, WholeWord, X } from "lucide-react";
import { useEditorLayout } from "../../context/editor-layout-context";
import { setFindOption, setFindQuery, useFindState } from "src/lib/find-store";
import "./sidebar-search-input.scss";

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
    <button
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
    </button>
  );
}

// Find-in-pages input. Lives in the sidebar header, stacked behind the
// workspace switcher; the header's search icon swaps them. Match-case /
// whole-word / regex toggles sit inside it, VS Code-style. Esc clears the
// query, then closes.
export function SidebarSearchInput() {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const { query, options, focusNonce } = useFindState();
  const { sidebarView, setSidebarView } = useEditorLayout();
  const isOpen = sidebarView === "search";

  // Focus only for requests made AFTER mount (icon click, Ctrl/⌘+Shift+F) —
  // the input stays mounted while hidden, so it must not grab focus just
  // because the sidebar re-rendered or re-expanded.
  const handledNonce = useRef(focusNonce);
  useEffect(() => {
    if (focusNonce === handledNonce.current) return;
    handledNonce.current = focusNonce;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [focusNonce]);

  const close = () => {
    setSidebarView("pages");
    inputRef.current?.blur();
  };

  return (
    <div className={`sb-search${isOpen ? " is-open" : ""}`}>
      <Search size={15} className="sb-search__icon" />
      <input
        ref={inputRef}
        className="sb-search__input"
        value={query}
        placeholder={t("find.placeholder", "Search in pages…")}
        spellCheck={false}
        tabIndex={isOpen ? 0 : -1}
        onChange={(e) => setFindQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Escape") return;
          e.preventDefault();
          if (query) setFindQuery("");
          else close();
        }}
      />

      <div className="sb-search__tools">
        {query && (
          <button
            type="button"
            className="fip-toggle"
            aria-label={t("find.clear", "Clear")}
            title={t("find.clear", "Clear")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setFindQuery("")}
          >
            <X size={13} />
          </button>
        )}
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
      </div>
    </div>
  );
}
