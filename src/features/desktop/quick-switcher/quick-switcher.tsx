import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { MaterialIcon } from "src/components/icons";
import { Card } from "src/components/tiptap-ui-primitive/card";
import { usePages } from "src/hooks/use-pages";
import { useActivePageActions } from "src/features/pages/context/active-page-context";
import { PageItemIcon } from "src/features/pages/page-item/page-item-icon";
import type { Page } from "src/types";
import { isMac } from "../platform";
import { placeOf } from "../tabs/tab-label";
import { tabs, useTabs, type Tab } from "../tabs/tabs-store";
import "./quick-switcher.scss";

// Ctrl+P (Cmd+P) in the desktop app: jump to an open tab or a page by
// typing part of its name. Open tabs first, then pages (most recently
// edited first). Enter goes there in this tab (an open tab: switches to
// it); Ctrl+Enter opens a page in a new tab. Mounted with the tabs
// (desktop-tabs.tsx).

const PAGE_LIMIT = 8;

type Row =
  | { kind: "tab"; tab: Tab; title: string; page: Page | null }
  | { kind: "page"; page: Page; title: string };

export function QuickSwitcher() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "p") {
        // Not the webview's print dialog.
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  if (!open) return null;
  return createPortal(
    <Switcher onClose={() => setOpen(false)} />,
    document.body,
  );
}

function tabTitle(
  tab: Tab,
  pagesById: Map<string, Page>,
  t: TFunction,
): string {
  const place = placeOf(tab.path);
  if (place.kind === "page")
    return pagesById.get(place.id)?.title || t("page.untitled");
  if (place.kind === "chat") return t("chat.title");
  return t(`sidebar.${place.kind}`);
}

function Switcher({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { data: pages = [] } = usePages();
  const { tabs: openTabs, activeId } = useTabs();
  const { setActivePageId } = useActivePageActions();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();
    const pagesById = new Map(pages.map((p) => [p.id, p]));
    const matches = (title: string) => !q || title.toLowerCase().includes(q);

    const tabRows: Row[] = openTabs
      .filter((tab) => tab.id !== activeId)
      .map((tab) => {
        const place = placeOf(tab.path);
        return {
          kind: "tab" as const,
          tab,
          title: tabTitle(tab, pagesById, t),
          page:
            place.kind === "page" ? (pagesById.get(place.id) ?? null) : null,
        };
      })
      .filter((row) => matches(row.title));

    const inTabs = new Set(
      tabRows.flatMap((row) =>
        row.kind === "tab" && row.page ? [row.page.id] : [],
      ),
    );
    const pageRows: Row[] = [...pages]
      .filter(
        (p) => !inTabs.has(p.id) && matches(p.title || t("page.untitled")),
      )
      .sort(
        (a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt),
      )
      .slice(0, PAGE_LIMIT)
      .map((page) => ({
        kind: "page" as const,
        page,
        title: page.title || t("page.untitled"),
      }));

    return [...tabRows, ...pageRows];
  }, [query, pages, openTabs, activeId, t]);

  // Typing starts the list over at its first row.
  const [seenQuery, setSeenQuery] = useState(query);
  if (seenQuery !== query) {
    setSeenQuery(query);
    setSelected(0);
  }

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${selected}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const go = (row: Row, newTab: boolean) => {
    onClose();
    if (row.kind === "tab") {
      tabs.activate(row.tab.id);
    } else if (newTab) {
      tabs.open(`/page/${row.page.id}`);
    } else {
      setActivePageId(row.page.id);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = rows[selected];
      if (row) go(row, isMac ? e.metaKey : e.ctrlKey);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const firstPage = rows.findIndex((row) => row.kind === "page");
  const hasTabs = rows.length > 0 && rows[0].kind === "tab";

  return (
    <div className="quick-switcher" role="presentation" onMouseDown={onClose}>
      <Card
        className="quick-switcher__card"
        role="dialog"
        aria-modal="true"
        aria-label={t("desktop.quickSwitcher")}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="quick-switcher__search">
          <MaterialIcon name="search" size={18} />
          <input
            autoFocus
            value={query}
            placeholder={t("desktop.switcherPlaceholder")}
            aria-label={t("desktop.switcherPlaceholder")}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>
        <div className="quick-switcher__list" ref={listRef} role="listbox">
          {rows.length === 0 && (
            <div className="quick-switcher__empty">
              {t("desktop.noResults")}
            </div>
          )}
          {rows.map((row, i) => (
            <div
              key={row.kind === "tab" ? `t-${row.tab.id}` : `p-${row.page.id}`}
            >
              {i === 0 && hasTabs && (
                <div className="quick-switcher__group">
                  {t("desktop.openTabs")}
                </div>
              )}
              {i === firstPage && (
                <div className="quick-switcher__group">
                  {t("desktop.pages")}
                </div>
              )}
              <button
                type="button"
                role="option"
                aria-selected={i === selected}
                data-idx={i}
                className="quick-switcher__row"
                onMouseMove={() => setSelected(i)}
                onClick={(e) => go(row, isMac ? e.metaKey : e.ctrlKey)}
              >
                <span className="quick-switcher__icon">
                  {row.kind === "page" || row.page ? (
                    <PageItemIcon
                      cover={(row.kind === "page" ? row.page : row.page)?.cover}
                      styles={{ width: 16, height: 16, fontSize: 14 }}
                    />
                  ) : (
                    <MaterialIcon name="tab" size={16} />
                  )}
                </span>
                <span className="quick-switcher__title">
                  <Highlight text={row.title} query={query} />
                </span>
                {row.kind === "tab" && (
                  <span className="quick-switcher__hint">
                    {t("desktop.switchToTab")}
                  </span>
                )}
              </button>
            </div>
          ))}
        </div>
        <div className="quick-switcher__foot">
          <span>
            <kbd>↵</kbd> {t("desktop.open")}
          </span>
          <span>
            <kbd>{isMac ? "⌘" : "Ctrl"} ↵</kbd> {t("desktop.openInNewTab")}
          </span>
          <span>
            <kbd>Esc</kbd> {t("desktop.closeSwitcher")}
          </span>
        </div>
      </Card>
    </div>
  );
}

/** The part of the title that matches what was typed, in bold. */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  const at = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (at === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <b>{text.slice(at, at + q.length)}</b>
      {text.slice(at + q.length)}
    </>
  );
}
