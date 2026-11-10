import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useDeferredValue,
} from "react";
import { useTranslation } from "react-i18next";
import "./search-palette.scss";
import { useSearch } from "./search-context";
import { useActivePageActions } from "../../pages/context/active-page-context";
import { PageItemIcon } from "../../pages/page-item/page-item-icon";
import type { ID, Page, PageCover } from "src/types";
import type { JSONContent } from "@tiptap/core";
import { usePages } from "src/hooks/use-pages";
import { useIsMobile } from "src/hooks/use-breakpoint";
import { useRowIdIndex } from "src/features/database/hooks/use-row-id-index";
import { useRowLinks } from "src/features/database/hooks/use-row-links";
import { idMatches } from "src/features/database/utils/row-summary";
import { findInPages, type FindMatch } from "src/lib/find-in-pages";
import { setPendingScrollTarget } from "src/features/inbox/inbox-panel/pending-scroll-target";

// Results are grouped by when the page was last edited, newest first. Then
// "In page text": pages whose text contains what's typed (the same search
// as the sidebar's), with the matching line.
type Group =
  | "ids"
  | "today"
  | "yesterday"
  | "week"
  | "month"
  | "older"
  | "text";
const DATE_GROUPS = ["today", "yesterday", "week", "month", "older"] as const;
const GROUP_LABEL: Record<Group, string> = {
  ids: "search.byId",
  today: "search.today",
  yesterday: "search.yesterday",
  week: "search.pastWeek",
  month: "search.past30Days",
  older: "search.older",
  text: "search.inText",
};

/** Plain, case-insensitive text search, as typed. */
const TEXT_FIND = { matchCase: false, wholeWord: false, regex: false };
/** Pages shown under "In page text". */
const MAX_TEXT_PAGES = 8;

interface SearchEntry {
  page: Page;
  /** A database row found by its ID ("TASK-12"): opens in its database. */
  idText?: string;
  title: string;
  location: string | null; // the pages it sits in: "Parent / Child"
  group: Group;
  /** "In page text": the first match in the page, to open at. */
  find?: FindMatch;
}

type IconName =
  | "search"
  | "user"
  | "layers"
  | "doc"
  | "calendar"
  | "chevron"
  | "return"
  | "updown"
  | "enter"
  | "arrow"
  | "panel";

interface FilterDef {
  id: string;
  label: string; // i18n key, resolved with t() at render
  lead?: string;
  icon?: IconName;
  toggle?: boolean;
}

interface Match {
  entry: SearchEntry;
  titleHl: number[] | null;
  locHl: number[] | null;
}

const FILTERS: FilterDef[] = [
  {
    id: "titles",
    label: "search.filters.titlesOnly",
    lead: "Aa",
    toggle: true,
  },
  { id: "created", label: "search.filters.createdBy", icon: "user" },
  { id: "teamspace", label: "search.filters.teamspace", icon: "layers" },
  { id: "page", label: "search.filters.inPage", icon: "doc" },
  { id: "date", label: "search.filters.date", icon: "calendar" },
];

// ---- helpers ----

function ageGroup(when: number | null | undefined): Group {
  if (!when) return "older";
  const d = new Date(Number(when));
  if (isNaN(d.getTime())) return "older";
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const day = 24 * 60 * 60 * 1000;
  const t = d.getTime();
  if (t >= startOfToday.getTime()) return "today";
  if (t >= startOfToday.getTime() - day) return "yesterday";
  if (t >= startOfToday.getTime() - 7 * day) return "week";
  if (t >= startOfToday.getTime() - 30 * day) return "month";
  return "older";
}

// The pages a page sits in, root first: "Reading List / Books".
function pathOf(
  page: Page,
  byId: Map<ID, Page>,
  untitled: string,
): string | null {
  const chain: string[] = [];
  const seen = new Set<ID>();
  let cur = page.parentId != null ? byId.get(page.parentId) : undefined;
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    chain.push(cur.title || untitled);
    cur = cur.parentId != null ? byId.get(cur.parentId) : undefined;
  }
  return chain.length ? chain.reverse().join(" / ") : null;
}

/** [start, end) ranges → each index inside them, for Highlight. */
function rangesToIndices(ranges: [number, number][]): number[] {
  const out: number[] = [];
  for (const [s, e] of ranges) for (let i = s; i < e; i++) out.push(i);
  return out;
}

function fuzzyMatch(query: string, text: string): number[] | null {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  const indices: number[] = [];
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      indices.push(ti);
      qi++;
    }
  }
  return qi === q.length ? indices : null;
}

// cover → CSS background (image > gradient > color), same as the gallery
function coverBackground(cover: PageCover | undefined): string {
  if (cover?.coverImage)
    return `center / cover no-repeat url(${cover.coverImage})`;
  if (cover?.gradient) return cover.gradient;
  if (cover?.color) return cover.color;
  return "var(--tt-hover-bg-color, rgba(0,0,0,0.04))";
}

// flatten a node's inline text
function inlineText(node: JSONContent | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  if (Array.isArray(node.content)) return node.content.map(inlineText).join("");
  return "";
}

function Icon({ name, size = 14 }: { name: IconName; size?: number }) {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "search":
      return (
        <svg {...p}>
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      );
    case "user":
      return (
        <svg {...p}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
        </svg>
      );
    case "layers":
      return (
        <svg {...p}>
          <path d="M12 3 3 8l9 5 9-5-9-5Z" />
          <path d="m3 13 9 5 9-5" />
        </svg>
      );
    case "doc":
      return (
        <svg {...p}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
          <path d="M14 3v5h5" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...p}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 3v4M16 3v4" />
        </svg>
      );
    case "chevron":
      return (
        <svg {...p}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "return":
    case "enter":
      return (
        <svg {...p}>
          <path d="M9 10 4 15l5 5" />
          <path d="M20 4v7a4 4 0 0 1-4 4H4" />
        </svg>
      );
    case "updown":
      return (
        <svg {...p}>
          <path d="m7 4 0 16M3 8l4-4 4 4M17 20l0-16M13 16l4 4 4-4" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...p}>
          <path d="M7 17 17 7M7 7h10v10" />
        </svg>
      );
    case "panel":
      return (
        <svg {...p}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M15 4v16" />
        </svg>
      );
    default:
      return null;
  }
}

function Highlight({
  text,
  indices,
}: {
  text: string;
  indices: number[] | null;
}) {
  if (!indices || indices.length === 0) return <>{text}</>;
  const set = new Set(indices);
  return (
    <>
      {text.split("").map((ch, i) =>
        set.has(i) ? (
          <span key={i} className="sp-hl">
            {ch}
          </span>
        ) : (
          ch
        ),
      )}
    </>
  );
}

// Lightweight content preview — walks the doc into simple blocks (no editor).
function PreviewBlocks({ content }: { content: JSONContent }) {
  const { t } = useTranslation();
  const blocks = (content?.content ?? [])
    .filter((n) => n.type !== "title")
    .slice(0, 25);

  if (blocks.length === 0) {
    return <div className="sp-preview__empty">{t("search.noContent")}</div>;
  }

  return (
    <>
      {blocks.map((node, i) => {
        const text = inlineText(node).trim();
        switch (node.type) {
          case "heading": {
            const lvl = (node.attrs?.level as number) ?? 2;
            return (
              <div
                key={i}
                className="sp-preview__heading"
                style={{
                  fontSize: lvl <= 1 ? 20 : lvl === 2 ? 18 : 16,
                  fontWeight: 600,
                  margin: "10px 0 4px",
                }}
              >
                {text}
              </div>
            );
          }
          case "bulletList":
          case "orderedList":
            return (
              <ul
                key={i}
                style={{ margin: "4px 0", paddingLeft: 18, fontSize: 14 }}
              >
                {(node.content ?? []).map((li, j) => (
                  <li key={j} style={{ margin: "2px 0" }}>
                    {inlineText(li).trim()}
                  </li>
                ))}
              </ul>
            );
          case "taskList":
            return (
              <div key={i} style={{ margin: "4px 0", fontSize: 14 }}>
                {(node.content ?? []).map((li, j) => (
                  <div
                    key={j}
                    style={{ display: "flex", gap: 6, margin: "2px 0" }}
                  >
                    <span style={{ color: "var(--tt-theme-muted)" }}>
                      {li.attrs?.checked ? "☑" : "☐"}
                    </span>
                    <span>{inlineText(li).trim()}</span>
                  </div>
                ))}
              </div>
            );
          case "codeBlock":
            return (
              <pre
                key={i}
                style={{
                  margin: "6px 0",
                  padding: "8px 10px",
                  borderRadius: 6,
                  background: "var(--tt-hover-bg-color, rgba(0,0,0,0.05))",
                  fontSize: 12,
                  overflowX: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {text}
              </pre>
            );
          case "blockquote":
            return (
              <blockquote
                key={i}
                style={{
                  margin: "6px 0",
                  paddingLeft: 10,
                  borderLeft: "3px solid var(--tt-border-color)",
                  color: "var(--tt-theme-muted)",
                  fontSize: 14,
                }}
              >
                {text}
              </blockquote>
            );
          default:
            return text ? (
              <p
                key={i}
                style={{
                  margin: "4px 0",
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: "var(--tt-text-color)",
                }}
              >
                {text}
              </p>
            ) : null;
        }
      })}
    </>
  );
}

export default function SearchPalette() {
  const { t } = useTranslation();
  const { data: pages } = usePages();
  const { setActivePageId } = useActivePageActions();
  const { onOpenChange } = useSearch();
  const { list: rowsWithIds } = useRowIdIndex();
  const { openRow } = useRowLinks();
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
  // The text search reads every page: deferred so typing stays smooth.
  const textQuery = useDeferredValue(query);
  const [titlesOnly, setTitlesOnly] = useState(false);
  // The preview beside the results (Notion's panel toggle, top right).
  const [showPreview, setShowPreview] = useState(true);
  const [selected, setSelected] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // id → page, for breadcrumb resolution in the preview
  const byId = useMemo(() => {
    const m = new Map<ID, Page>();
    for (const p of pages ?? []) m.set(p.id, p);
    return m;
  }, [pages]);

  // Build searchable entries from the real page tree.
  const entries = useMemo<SearchEntry[]>(() => {
    if (!pages) return [];
    const untitled = t("page.untitled");
    return pages
      .filter((p) => p.category !== "Template")
      .map((p) => ({
        page: p,
        title: p.title || untitled,
        location: pathOf(p, byId, untitled),
        group: ageGroup(p.updatedAt ?? p.createdAt),
      }))
      .sort(
        (a, b) =>
          Number(b.page.updatedAt ?? b.page.createdAt ?? 0) -
          Number(a.page.updatedAt ?? a.page.createdAt ?? 0),
      );
  }, [pages, byId, t]);

  const results = useMemo<Match[]>(() => {
    const q = query.trim();
    if (!q) return entries.map((entry) => ({ entry, titleHl: [], locHl: [] }));
    const out: Match[] = [];
    // Rows whose ID starts with what's typed ("BUG-4" → BUG-4, BUG-42…)
    // come first: an ID is the most precise thing someone can type.
    for (const { row, idText } of rowsWithIds) {
      if (out.length >= 5) break;
      if (!idMatches(idText, q)) continue;
      out.push({
        entry: {
          page: row,
          idText,
          title: row.title || t("page.untitled"),
          location: null,
          group: "ids",
        },
        titleHl: [],
        locHl: null,
      });
    }
    for (const entry of entries) {
      const titleHl = fuzzyMatch(q, entry.title);
      const locHl =
        !titlesOnly && entry.location ? fuzzyMatch(q, entry.location) : null;
      if (titleHl !== null || locHl !== null)
        out.push({ entry, titleHl, locHl });
    }
    return out;
  }, [query, titlesOnly, entries, rowsWithIds, t]);

  // Pages whose text has the words, newest first (entries' order), with
  // the first matching line. Not with "Only search titles".
  const textResults = useMemo<Match[]>(() => {
    if (titlesOnly || textQuery.trim().length < 2) return [];
    const found = findInPages(
      entries.map((e) => e.page).filter((p) => p.deletedAt == null),
      textQuery,
      TEXT_FIND,
    );
    const byPage = new Map(found.pages.map((r) => [r.page.id, r]));
    const out: Match[] = [];
    for (const entry of entries) {
      if (out.length >= MAX_TEXT_PAGES) break;
      const hit = byPage.get(entry.page.id)?.matches[0];
      if (!hit) continue;
      out.push({
        entry: { ...entry, group: "text", find: hit },
        titleHl: null,
        locHl: null,
      });
    }
    return out;
  }, [titlesOnly, textQuery, entries]);

  const groups = useMemo(() => {
    const all = [...results, ...textResults];
    const sections = (["ids", ...DATE_GROUPS, "text"] as Group[])
      .map((group) => ({
        group,
        rows: all.filter((r) => r.entry.group === group),
      }))
      .filter((sec) => sec.rows.length > 0);
    return { sections, order: sections.flatMap((sec) => sec.rows) };
  }, [results, textResults]);

  // Clamp selection at point of use — no effect, no cascading render.
  const maxIndex = Math.max(0, groups.order.length - 1);
  const safeSelected = Math.min(selected, maxIndex);

  // The page shown in the preview panel = the currently highlighted result.
  const selectedPage = groups.order[safeSelected]?.entry.page ?? null;

  // the pages it sits in, for the preview's breadcrumb
  const breadcrumb = selectedPage
    ? pathOf(selectedPage, byId, t("page.untitled"))
    : null;

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${selected}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const open = (page: Page, find?: FindMatch) => {
    onOpenChange?.(false);
    // A text match: the page opens scrolled to it, highlighted.
    if (find && !page.sourceId) {
      setPendingScrollTarget({
        pageId: page.id,
        type: "find",
        find: {
          query: textQuery,
          options: TEXT_FIND,
          blockIndex: find.blockIndex,
        },
      });
    }
    // A row opens in its database (the peek); a page as itself.
    if (page.sourceId) openRow(page.id);
    else setActivePageId(page.id);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, groups.order.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      const m = groups.order[safeSelected];
      if (m) open(m.entry.page, m.entry.find);
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange?.(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenChange]);

  const renderRow = (m: Match) => {
    const idx = groups.order.indexOf(m);
    const isSel = idx === safeSelected;
    return (
      <div
        key={`${m.entry.group}:${m.entry.page.id}`}
        data-idx={idx}
        role="option"
        aria-selected={isSel}
        className={`sp-row${isSel ? " sp-row--sel" : ""}${m.entry.find ? " sp-row--text" : ""}`}
        onMouseEnter={() => setSelected(idx)}
        onClick={() => open(m.entry.page, m.entry.find)}
      >
        <span className="sp-row__icon">
          <PageItemIcon
            cover={m.entry.page.cover}
            styles={{ width: 18, height: 18, fontSize: 18 }}
          />
        </span>
        <span className="sp-row__title">
          {m.entry.idText && (
            <span className="sp-row__id">{m.entry.idText}</span>
          )}
          <Highlight text={m.entry.title} indices={m.titleHl} />
        </span>
        {m.entry.find && (
          <span className="sp-row__snippet">
            <Highlight
              text={m.entry.find.snippet}
              indices={rangesToIndices(m.entry.find.ranges)}
            />
          </span>
        )}
        {!m.entry.find && m.entry.location && (
          <span className="sp-row__loc">
            {" — "}
            <Highlight text={m.entry.location} indices={m.locHl} />
          </span>
        )}
      </div>
    );
  };

  const previewOn = !isMobile && showPreview;
  const hasCover =
    !!selectedPage?.cover?.coverImage || !!selectedPage?.cover?.gradient;

  return (
    <div className="sp-backdrop" onClick={() => onOpenChange?.(false)}>
      <div
        className="sp"
        role="dialog"
        aria-label={t("search.title")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sp-search">
          <span className="sp-search__icon">
            <Icon name="search" size={20} />
          </span>
          <input
            ref={inputRef}
            className="sp-search__input"
            placeholder={t("search.placeholder")}
            aria-label={t("search.title")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          {isMobile ? (
            <button
              type="button"
              className="sp-icon-btn"
              aria-label={t("actions.close", "Close")}
              onClick={() => onOpenChange?.(false)}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              className={`sp-icon-btn${showPreview ? " sp-icon-btn--on" : ""}`}
              aria-label={t("search.togglePreview")}
              aria-pressed={showPreview}
              title={t("search.togglePreview")}
              onClick={() => setShowPreview((v) => !v)}
            >
              <Icon name="panel" size={18} />
            </button>
          )}
        </div>

        <div className="sp-filters">
          {FILTERS.map((f) => {
            const on = f.toggle && titlesOnly;
            return (
              <button
                key={f.id}
                type="button"
                className={`sp-filter${on ? " sp-filter--on" : ""}`}
                aria-pressed={f.toggle ? !!on : undefined}
                onClick={() => f.toggle && setTitlesOnly((v) => !v)}
              >
                {f.lead ? (
                  <span className="sp-filter__aa">{f.lead}</span>
                ) : f.icon ? (
                  <Icon name={f.icon} size={16} />
                ) : null}
                <span>{t(f.label)}</span>
                {!f.toggle && (
                  <span className="sp-filter__chev">
                    <Icon name="chevron" size={13} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* body: results (left) + preview (right, desktop only) */}
        <div className="sp-body">
          <div className="sp-results" ref={listRef} role="listbox">
            {groups.order.length === 0 && (
              <div className="sp-empty">
                {query ? t("search.noResults", { query }) : t("search.noPages")}
              </div>
            )}
            {groups.sections.map((sec) => (
              <div
                key={sec.group}
                role="group"
                aria-label={t(GROUP_LABEL[sec.group])}
              >
                <div className="sp-section">{t(GROUP_LABEL[sec.group])}</div>
                {sec.rows.map(renderRow)}
              </div>
            ))}
          </div>

          {previewOn && (
            <div className="sp-preview">
              {selectedPage ? (
                <div className="sp-preview__card">
                  {hasCover && (
                    <div
                      className="sp-preview__cover"
                      style={{
                        background: coverBackground(selectedPage.cover),
                      }}
                    />
                  )}
                  <button
                    type="button"
                    className="sp-preview__open"
                    aria-label={t("search.openPage")}
                    title={t("search.openPage")}
                    onClick={() => open(selectedPage)}
                  >
                    <Icon name="arrow" size={14} />
                  </button>

                  <div
                    className={`sp-preview__body${hasCover ? " sp-preview__body--under-cover" : ""}`}
                  >
                    {selectedPage.cover?.iconName && (
                      <div className="sp-preview__icon">
                        <PageItemIcon
                          cover={selectedPage.cover}
                          styles={{ width: 44, height: 44, fontSize: 44 }}
                        />
                      </div>
                    )}
                    {breadcrumb && (
                      <div className="sp-preview__crumbs">{breadcrumb}</div>
                    )}
                    <div className="sp-preview__title">
                      {selectedPage.title || t("page.untitled")}
                    </div>
                    <div className="sp-preview__content">
                      <PreviewBlocks content={selectedPage.content} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="sp-preview__placeholder">
                  {t("search.previewEmpty")}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sp-footer">
          <span className="sp-hint">
            <Icon name="updown" size={13} /> {t("search.hintSelect")}
          </span>
          <span className="sp-hint">
            <Icon name="enter" size={13} /> {t("search.hintOpen")}
          </span>
        </div>
      </div>
    </div>
  );
}
