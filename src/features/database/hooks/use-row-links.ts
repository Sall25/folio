import { useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-location";
import type { DataSource, ID, Page } from "src/types";
import { queryKeys } from "src/lib/queryKeys";
import { spacePagePath } from "src/hooks/use-current-space";
import { usePageViewActions } from "src/features/pages/context/page-view-context";
import { useOptionalActivePage } from "src/features/pages/context/active-page-context";
import { appUrl } from "src/lib/app-url";

// ─────────────────────────────────────────────────────────────────────────────
// Links to a ROW, not just to its page.
//
// A row's link opens the page of its database with the row open in the side
// peek and its row highlighted (the open-record mark) and scrolled into view:
//
//     /page/<database page>?row=<row id>     (or /t/<teamspace>/page/…)
//
// "Copy link" on a row gives it; a row mention opens it; anyone opening it
// lands in the database, where the row is, instead of on a bare page.
// ─────────────────────────────────────────────────────────────────────────────

/** The search parameter a row link carries. */
export const ROW_PARAM = "row";

/** A row's database page, from what's already loaded (no fetch). */
function rowHome(
  qc: ReturnType<typeof useQueryClient>,
  recordId: ID,
): { pageId: ID; teamspaceId: ID | null } | null {
  const pages = qc
    .getQueriesData<Page[]>({ queryKey: queryKeys.pages.lists() })
    .flatMap(([, d]) => (Array.isArray(d) ? d : []));
  const record =
    pages.find((p) => p.id === recordId) ??
    qc.getQueryData<Page>(queryKeys.pages.detail(recordId));
  if (!record?.sourceId) return null;

  const source =
    qc
      .getQueriesData<DataSource[]>({
        queryKey: queryKeys.dataSources.lists(),
      })
      .flatMap(([, d]) => (Array.isArray(d) ? d : []))
      .find((s) => s.id === record.sourceId) ??
    qc.getQueryData<DataSource>(queryKeys.dataSources.detail(record.sourceId));
  const pageId = source?.pageId;
  if (!pageId) return null;

  const dbPage = pages.find((p) => p.id === pageId);
  return {
    pageId,
    teamspaceId: dbPage?.teamspaceId ?? record.teamspaceId ?? null,
  };
}

/** The row's element in the main editor (not in a peek or centre view). */
function findRowElement(recordId: ID): HTMLElement | null {
  const selector = `.db-record[data-record-id="${CSS.escape(recordId)}"]`;
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    if (!el.closest(".page-peek, .page-create-modal")) return el;
  }
  return null;
}

/**
 * Scroll a row into view once it's on the page — a database renders after
 * its page, so it waits for the row (up to a few seconds). The row's box is
 * its renderer in a table or list; a card is its own box.
 */
export function revealRow(recordId: ID) {
  const go = (el: HTMLElement) => {
    const box = el.closest<HTMLElement>(".react-renderer.node-databaseRecord");
    const target = box && box.getBoundingClientRect().height > 0 ? box : el;
    target.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const now = findRowElement(recordId);
  if (now) {
    go(now);
    return;
  }
  const observer = new MutationObserver(() => {
    const el = findRowElement(recordId);
    if (!el) return;
    observer.disconnect();
    clearTimeout(stop);
    go(el);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  const stop = setTimeout(() => observer.disconnect(), 8000);
}

export function useRowLinks() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { setTarget } = usePageViewActions();
  // Optional: a row chip can show where the app's providers aren't.
  const { setActivePageId } = useOptionalActivePage();

  /** The row's link, as a path inside the app; null if it isn't a row. */
  const rowPath = useCallback(
    (recordId: ID): string | null => {
      const home = rowHome(qc, recordId);
      if (!home) return null;
      const params = new URLSearchParams({ [ROW_PARAM]: recordId });
      return `${spacePagePath(home.teamspaceId, home.pageId)}?${params}`;
    },
    [qc],
  );

  /** The full address to share; a page's own address when not a row. */
  const rowUrl = useCallback(
    (recordId: ID): string =>
      appUrl(rowPath(recordId) ?? spacePagePath(null, recordId)),
    [rowPath],
  );

  /**
   * Open a row where it lives: already on screen (its database is on this
   * page) → peek it and scroll to it; else go to its database's page, which
   * does the same. Not a row → open it as a page.
   */
  const openRow = useCallback(
    (recordId: ID) => {
      if (findRowElement(recordId)) {
        setTarget({ pageId: recordId, view: "Peek" });
        revealRow(recordId);
        return;
      }
      const home = rowHome(qc, recordId);
      if (!home) {
        setTarget(undefined);
        setActivePageId(recordId);
        return;
      }
      navigate({
        to: spacePagePath(home.teamspaceId, home.pageId),
        search: { [ROW_PARAM]: recordId },
      });
    },
    [qc, navigate, setTarget, setActivePageId],
  );

  return { rowPath, rowUrl, openRow };
}

/**
 * Follows a row link: when the address carries ?row=, the row opens in the
 * side peek and is scrolled into view, then the parameter is dropped (so
 * closing the peek and reloading doesn't bring it back). Mount once, where
 * the page view lives (page-overlays.tsx).
 */
export function useOpenRowFromUrl() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setTarget } = usePageViewActions();
  const search = location.current.search as Record<string, unknown>;
  const row = typeof search[ROW_PARAM] === "string" ? search[ROW_PARAM] : null;

  useEffect(() => {
    if (!row) return;
    setTarget({ pageId: row, view: "Peek" });
    revealRow(row);
    navigate({
      search: (old) => {
        const next = { ...(old as Record<string, unknown>) };
        delete next[ROW_PARAM];
        return next;
      },
      replace: true,
    });
  }, [row, setTarget, navigate]);
}
