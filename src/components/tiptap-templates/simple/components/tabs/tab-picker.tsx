import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  fuzzyMatch as defaultFuzzy,
  type FuzzyResult,
} from "src/lib/fuzzy-match";
import type { Page } from "../../types";
import styles from "./tab-picker.module.scss";

interface TabPickerProps {
  /** All pages the user can open. */
  pages: Page[];
  /** Page ids ordered most-recent-first, for the empty-query "Recent" list. */
  recentPageIds?: Page["id"][];
  /** Open an existing page in a new tab. */
  onSelect: (page: Page) => void;
  /**
   * Create a new page with this title and open it.
   * NB: your addPageAsync signature types `title` as `number` — that looks
   * like a typo (it should be string). The string flows through here.
   */
  onCreate: (title: string) => void;
  /** Close the picker (Esc, outside click, or after a choice). */
  onClose: () => void;
  /** Map a Page's cover.iconName to a real icon node from your icon set. */
  renderIcon?: (iconName: string | null) => ReactNode;
  /** Swap in your command-palette matcher. Defaults to the bundled one. */
  fuzzy?: (query: string, target: string) => FuzzyResult;
}

type Row =
  | { kind: "page"; page: Page; indices: number[] }
  | { kind: "create"; title: string };

function Highlight({ text, indices }: { text: string; indices: number[] }) {
  if (!indices.length) return <>{text}</>;
  const hit = new Set(indices);
  return (
    <>
      {text.split("").map((ch, i) =>
        hit.has(i) ? (
          <mark key={i} className={styles.mark}>
            {ch}
          </mark>
        ) : (
          ch
        ),
      )}
    </>
  );
}

export function TabPicker({
  pages,
  recentPageIds,
  onSelect,
  onCreate,
  onClose,
  renderIcon,
  fuzzy = defaultFuzzy,
}: TabPickerProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const icon = (name: string | null): ReactNode =>
    renderIcon ? renderIcon(name) : (name ?? "▢");

  const rows = useMemo<Row[]>(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      const order = new Map((recentPageIds ?? []).map((id, i) => [id, i]));
      const recent = [...pages].sort(
        (a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity),
      );
      return recent.map((page) => ({ kind: "page", page, indices: [] }));
    }

    const scored = pages
      .map((page) => ({ page, res: fuzzy(trimmed, page.title) }))
      .filter((x) => x.res.matched)
      .sort((a, b) => b.res.score - a.res.score)
      .map<Row>(({ page, res }) => ({
        kind: "page",
        page,
        indices: res.indices,
      }));

    const exact = pages.some(
      (p) => p.title.toLowerCase() === trimmed.toLowerCase(),
    );
    if (!exact) scored.push({ kind: "create", title: trimmed });
    return scored;
  }, [query, pages, recentPageIds, fuzzy]);

  // Clamp during render instead of syncing in an effect — rows can shrink
  // (fewer matches, pages prop changes) without active being reset.
  const activeIndex = rows.length ? Math.min(active, rows.length - 1) : 0;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);

  const choose = (row: Row) => {
    if (row.kind === "page") onSelect(row.page);
    else onCreate(row.title);
    onClose();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((activeIndex + 1) % rows.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((activeIndex - 1 + rows.length) % rows.length);
        break;
      case "Enter":
        e.preventDefault();
        if (rows[activeIndex]) choose(rows[activeIndex]);
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  };

  const showRecentLabel = !query.trim() && rows.length > 0;

  return (
    <div
      ref={rootRef}
      className={styles.picker}
      role="dialog"
      aria-label="Open a page"
    >
      <div className={styles.searchRow}>
        <span className={styles.searchIcon} aria-hidden>
          {/* replace with your search icon */}⌕
        </span>
        <input
          ref={inputRef}
          className={styles.search}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search or create a page…"
          aria-label="Search or create a page"
        />
      </div>

      {showRecentLabel && <div className={styles.sectionLabel}>Recent</div>}

      <ul className={styles.list} role="listbox">
        {rows.map((row, i) => {
          const isActive = i === activeIndex;
          const key = row.kind === "page" ? `p${row.page.id}` : "__create";
          return (
            <li
              key={key}
              role="option"
              aria-selected={isActive}
              className={`${styles.row} ${isActive ? styles.active : ""}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(row)}
            >
              {row.kind === "page" ? (
                <>
                  <span className={styles.icon}>
                    {icon(row.page.cover.iconName)}
                  </span>
                  <span className={styles.label}>
                    <Highlight
                      text={row.page.title || "Untitled"}
                      indices={row.indices}
                    />
                  </span>
                  {isActive && <span className={styles.enter}>↵</span>}
                </>
              ) : (
                <>
                  <span className={styles.icon} aria-hidden>
                    ＋
                  </span>
                  <span className={styles.label}>
                    Create <strong>“{row.title}”</strong>
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default TabPicker;
