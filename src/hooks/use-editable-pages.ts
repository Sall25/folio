import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchEditablePageIds } from "src/api/editable-pages";
import { useCurrentWorkspace } from "./use-workspaces";

// Which pages the current user can edit — one query for the whole sidebar
// instead of a permission query per row.
//
// NOT keyed under queryKeys.pages: mutation hooks walk every cached "pages"
// entry expecting Page[] (the delete cascade flattens them), and an id list
// there would corrupt that. `pageCount` is part of the key instead, so the
// list refetches whenever pages appear or disappear.
export function useEditablePageIds(pageCount: number) {
  const { workspaceId } = useCurrentWorkspace();
  const query = useQuery({
    queryKey: ["editable-pages", workspaceId ?? "", pageCount],
    queryFn: fetchEditablePageIds,
    enabled: !!workspaceId,
    staleTime: 60_000,
    // Keep the previous list while a refetch is in flight — no flicker of
    // the row actions when the count changes.
    placeholderData: keepPreviousData,
  });
  const set = useMemo(() => new Set(query.data ?? []), [query.data]);
  return set;
}
