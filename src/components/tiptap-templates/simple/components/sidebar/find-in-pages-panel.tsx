import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, X } from "lucide-react";
import { PageItemIcon } from "../../page-item-icon";
import { useFindInPages } from "src/hooks/use-find-in-pages";
import type { FindMatch, FindOptions } from "src/lib/find-in-pages";
import type { ID, Page } from "src/types";
import { useFindState } from "src/lib/find-store";
import "./find-in-pages-panel.scss";

interface FindInPagesPanelProps {
  onClose: () => void;
  /** Open the page and bring the matched text into view. */
  onOpenMatch: (
    page: Page,
    match: FindMatch,
    query: string,
    options: FindOptions,
  ) => void;
}

function Highlighted({
  text,
  ranges,
}: {
  text: string;
  ranges: [number, number][];
}) {
  if (!ranges.length) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([s, e], i) => {
    if (s > cursor) parts.push(text.slice(cursor, s));
    parts.push(
      <mark key={i} className="fip-hl">
        {text.slice(s, e)}
      </mark>,
    );
    cursor = e;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

// Results for the sidebar search input (SidebarSearchInput owns the query and
// options). Replaces the page tree while open; grouped by page, each row a
// block snippet with the matches highlighted.
export function FindInPagesPanel({
  onClose,
  onOpenMatch,
}: FindInPagesPanelProps) {
  const { t } = useTranslation();
  const { query, options } = useFindState();
  const [collapsed, setCollapsed] = useState<Set<ID>>(new Set());

  const { result, isSearching } = useFindInPages(query, options);

  const toggleCollapsed = (id: ID) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const hasQuery = query.trim().length > 0;

  let status: string;
  if (result.error) status = result.error;
  else if (!hasQuery)
    status = t("find.hint", "Type to search across your pages");
  else if (result.totalMatches === 0)
    status = t("find.noResults", "No results");
  else
    status =
      t("find.summary", {
        defaultValue: "{{count}} results in {{pages}} pages",
        count: result.totalMatches,
        pages: result.pages.length,
      }) +
      (result.truncated
        ? ` · ${t("find.truncated", "showing the first results")}`
        : "");

  return (
    <div className="fip">
      <div className="fip__header">
        <span
          className={[
            "fip__status",
            result.error && "fip__status--error",
            isSearching && "is-stale",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {status}
        </span>
        <button
          type="button"
          className="fip__close"
          aria-label={t("actions.close", "Close")}
          title={t("actions.close", "Close")}
          onClick={onClose}
        >
          <X size={14} />
        </button>
      </div>

      <div className={`fip__results${isSearching ? " is-stale" : ""}`}>
        {result.pages.map(({ page, matches, total }) => {
          const isCollapsed = collapsed.has(page.id);
          return (
            <div key={page.id} className="fip__group">
              <button
                type="button"
                className="fip__page"
                onClick={() => toggleCollapsed(page.id)}
              >
                <ChevronRight
                  size={13}
                  className="fip__chevron"
                  style={{ transform: isCollapsed ? "none" : "rotate(90deg)" }}
                />
                <span className="fip__page-icon">
                  <PageItemIcon
                    cover={page.cover}
                    styles={{ width: 14, height: 14, fontSize: 14 }}
                  />
                </span>
                <span className="fip__page-title">
                  {page.title || t("page.untitled")}
                </span>
                <span className="fip__count">{total}</span>
              </button>

              {!isCollapsed &&
                matches.map((match) => (
                  <button
                    type="button"
                    key={`${page.id}:${match.blockIndex}`}
                    className="fip__match"
                    onClick={() => onOpenMatch(page, match, query, options)}
                  >
                    <Highlighted text={match.snippet} ranges={match.ranges} />
                  </button>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
