import { useDeferredValue, useEffect, useMemo } from "react";
import { usePagesBase } from "./use-pages";
import { useCurrentSpace } from "./use-current-space";
import {
  findInPages,
  type FindOptions,
  type FindResult,
} from "src/lib/find-in-pages";
import type { Page } from "src/types";

const identity = (pages: Page[]) => pages;

// Full-text search over the current space:
//   • workspace → every page the sidebar shows (incl. joined teamspaces);
//   • teamspace → only that teamspace's pages.
// Trashed pages are excluded. The query is deferred so typing stays smooth,
// and pages are refetched when the panel opens — content is persisted by
// Hocuspocus on a debounce, so the cache can be slightly behind live edits.
export function useFindInPages(query: string, options: FindOptions) {
  const pagesQuery = usePagesBase(identity);
  const space = useCurrentSpace();
  const teamspaceId = space.kind === "teamspace" ? space.id : null;

  const { refetch } = pagesQuery;
  useEffect(() => {
    refetch();
  }, [refetch]);

  const scoped = useMemo(
    () =>
      (pagesQuery.data ?? []).filter(
        (p) =>
          p.deletedAt == null &&
          (teamspaceId == null || p.teamspaceId === teamspaceId),
      ),
    [pagesQuery.data, teamspaceId],
  );

  const deferredQuery = useDeferredValue(query);
  const { matchCase, wholeWord, regex } = options;

  const result: FindResult = useMemo(
    () => findInPages(scoped, deferredQuery, { matchCase, wholeWord, regex }),
    [scoped, deferredQuery, matchCase, wholeWord, regex],
  );

  return {
    result,
    isSearching: query !== deferredQuery,
    isLoading: pagesQuery.isLoading,
  };
}
