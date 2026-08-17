import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import "./search-palette.scss";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { useSearch } from "../context/search-context";
import { useActivePageActions } from "../context/active-page-context";
import { PageItemIcon } from "../page-item-icon";
import type { ID, Page, PageCover } from "src/types";
import type { JSONContent } from "@tiptap/core";
import { usePages } from "src/hooks/use-pages";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

type Group = "today" | "past";

interface SearchEntry {
  page: Page;
  title: string;
  location: string | null; // parent page title
  group: Group;
  date: string | null;
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
  | "arrow";

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

function isToday(dateStr: number | null | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function shortDate(
  dateStr: number | null | undefined,
  locale?: string,
): string | null {
  if (!dateStr) return null;
  const d = new Date(Number(dateStr));
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString(locale, { month: "short", day: "numeric" });
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
                  fontSize: lvl <= 1 ? 17 : lvl === 2 ? 15 : 14,
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
                style={{ margin: "4px 0", paddingLeft: 18, fontSize: 13 }}
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
              <div key={i} style={{ margin: "4px 0", fontSize: 13 }}>
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
                  fontSize: 13,
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
                  fontSize: 13,
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
  const { t, i18n } = useTranslation();
  const { data: pages } = usePages();
  const { setActivePageId } = useActivePageActions();
  const { onOpenChange } = useSearch();
  const [query, setQuery] = useState("");
  const [titlesOnly, setTitlesOnly] = useState(false);
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
    const flat = pages.filter((p) => p.category !== "Template");
    const map = new Map<ID, Page>();
    for (const p of flat) map.set(p.id, p);

    return flat.map((p) => {
      const parent = p.parentId != null ? map.get(p.parentId) : null;
      const when = p.updatedAt ?? p.createdAt;
      return {
        page: p,
        title: p.title || t("page.untitled"),
        location: parent
          ? parent.title || t("page.untitled")
          : (p.category ?? null),
        group: isToday(when) ? "today" : "past",
        date: shortDate(when, i18n.language),
      };
    });
  }, [pages, t, i18n.language]);

  const results = useMemo<Match[]>(() => {
    const q = query.trim();
    if (!q) return entries.map((entry) => ({ entry, titleHl: [], locHl: [] }));
    const out: Match[] = [];
    for (const entry of entries) {
      const titleHl = fuzzyMatch(q, entry.title);
      const locHl =
        !titlesOnly && entry.location ? fuzzyMatch(q, entry.location) : null;
      if (titleHl !== null || locHl !== null)
        out.push({ entry, titleHl, locHl });
    }
    return out;
  }, [query, titlesOnly, entries]);

  const groups = useMemo(() => {
    const today = results.filter((r) => r.entry.group === "today");
    const past = results.filter((r) => r.entry.group === "past");
    return { today, past, order: [...today, ...past] };
  }, [results]);

  // Clamp selection at point of use — no effect, no cascading render.
  const maxIndex = Math.max(0, groups.order.length - 1);
  const safeSelected = Math.min(selected, maxIndex);

  // The page shown in the preview panel = the currently highlighted result.
  const selectedPage = groups.order[safeSelected]?.entry.page ?? null;

  // ancestor chain (root → parent) for the preview breadcrumb
  const breadcrumb = useMemo(() => {
    if (!selectedPage) return "";
    const chain: string[] = [];
    const seen = new Set<ID>();
    let cur =
      selectedPage.parentId != null
        ? byId.get(selectedPage.parentId)
        : undefined;
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      chain.push(cur.title || t("page.untitled"));
      cur = cur.parentId != null ? byId.get(cur.parentId) : undefined;
    }
    return chain.reverse().join("  /  ");
  }, [selectedPage, byId, t]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${selected}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const open = (page: Page) => {
    onOpenChange?.(false);
    setActivePageId(page.id);
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
      if (m) open(m.entry.page);
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
        key={m.entry.page.id}
        data-idx={idx}
        className={`sp-row${isSel ? " sp-row--sel" : ""}`}
        onMouseEnter={() => setSelected(idx)}
        onClick={() => open(m.entry.page)}
      >
        <span className="sp-row__icon">
          <PageItemIcon cover={m.entry.page.cover} styles={{ fontSize: 15 }} />
        </span>
        <span className="sp-row__title">
          <Highlight text={m.entry.title} indices={m.titleHl} />
        </span>
        {m.entry.location && (
          <span className="sp-row__loc">
            — <Highlight text={m.entry.location} indices={m.locHl} />
          </span>
        )}
        <span className="sp-row__right">
          {isSel ? (
            <Icon name="return" size={15} />
          ) : m.entry.date ? (
            <span className="sp-row__date">{m.entry.date}</span>
          ) : null}
        </span>
      </div>
    );
  };

  return (
    <div className="sp-backdrop" onClick={() => onOpenChange?.(false)}>
      <div
        className="sp"
        role="dialog"
        aria-label={t("search.title")}
        onClick={(e) => e.stopPropagation()}
        style={{ width: 930, maxWidth: "98vw" }}
      >
        <CardItemGroup orientation="horizontal">
          <div className="sp-search">
            <span className="sp-search__icon">
              <Icon name="search" size={18} />
            </span>
            <input
              ref={inputRef}
              className="sp-search__input"
              placeholder={t("search.placeholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
            />
          </div>
        </CardItemGroup>

        <div className="sp-filters">
          {FILTERS.map((f) => {
            const on = f.toggle && titlesOnly;
            return (
              <button
                key={f.id}
                className={`sp-pill${on ? " sp-pill--on" : ""}`}
                onClick={() => f.toggle && setTitlesOnly((v) => !v)}
              >
                {f.lead ? (
                  <span className="sp-pill__aa">{f.lead}</span>
                ) : f.icon ? (
                  <Icon name={f.icon} size={13} />
                ) : null}
                <span>{t(f.label)}</span>
                {!f.toggle && (
                  <span className="sp-pill__chev">
                    <Icon name="chevron" size={13} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* body: results (left) + preview (right) */}
        <div style={{ display: "flex", flex: 1, minHeight: 0, gap: 10 }}>
          <div className="sp-results" ref={listRef} style={{ flex: 1 }}>
            {groups.order.length === 0 && (
              <div className="sp-empty">
                {query ? t("search.noResults", { query }) : t("search.noPages")}
              </div>
            )}
            {groups.today.length > 0 && (
              <>
                <div className="sp-section">{t("search.today")}</div>
                {groups.today.map(renderRow)}
              </>
            )}
            {groups.past.length > 0 && (
              <>
                <div className="sp-section">{t("search.past")}</div>
                {groups.past.map(renderRow)}
              </>
            )}
          </div>

          <Spacer orientation="horizontal" size={10} />

          {/* preview panel */}
          <div
            className="preview-panel"
            style={{
              width: 320,
              flexShrink: 0,
              borderLeft: "0.5px solid var(--tt-border-color)",
              overflowY: "auto",
            }}
          >
            {selectedPage ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    position: "relative",
                    height: 110,
                    background: coverBackground(selectedPage.cover),
                  }}
                >
                  <button
                    type="button"
                    aria-label={t("search.openPage")}
                    onClick={() => open(selectedPage)}
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      border: "none",
                      background: "var(--tt-card-bg-color)",
                      color: "var(--tt-text-color)",
                      cursor: "pointer",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                    }}
                  >
                    <Icon name="arrow" size={14} />
                  </button>
                </div>

                <div style={{ padding: "14px 16px 18px" }}>
                  <div style={{ marginBottom: 8 }}>
                    <PageItemIcon
                      cover={selectedPage.cover}
                      styles={{ fontSize: 28 }}
                    />
                  </div>

                  {breadcrumb && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--tt-theme-muted)",
                        marginBottom: 6,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {breadcrumb}
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: "var(--tt-text-color)",
                      marginBottom: 10,
                      lineHeight: 1.25,
                    }}
                  >
                    {selectedPage.title || t("page.untitled")}
                  </div>

                  <PreviewBlocks content={selectedPage.content} />
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: 24,
                  fontSize: 13,
                  color: "var(--tt-theme-muted)",
                  lineHeight: 1.5,
                }}
              >
                {t("search.previewEmpty")}
              </div>
            )}
          </div>
          <Spacer orientation="horizontal" size={10} />
        </div>

        <div className="sp-footer">
          <span className="sp-hint">
            <Icon name="updown" size={13} /> {t("search.hintSelect")}
          </span>
          <span className="sp-hint">
            <Icon name="enter" size={13} /> {t("search.hintOpen")}
          </span>
          <span className="sp-hint">
            <kbd className="sp-kbd">⌘</kbd>
            <Icon name="enter" size={13} /> {t("search.hintOpenNewWindow")}
          </span>
        </div>
      </div>
    </div>
  );
}
