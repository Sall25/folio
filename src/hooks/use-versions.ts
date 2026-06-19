import { useQuery } from "@tanstack/react-query";
import type { Version, ID } from "../types";
import { queryKeys } from "../lib/queryKeys";
import { fetchVersions, fetchVersion } from "../api/versions";

function useVersionsBase<T>(select?: (versions: Version[]) => T) {
  return useQuery({
    queryKey: queryKeys.versions.lists(),
    queryFn: fetchVersions,
    select,
  });
}

// a page's version history, newest first (how history panels read)
export function useVersionsByPage(pageId: ID | null) {
  return useVersionsBase((versions) =>
    pageId == null
      ? []
      : versions
          .filter((v) => v.pageId === pageId)
          .sort((a, b) => b.createdAt - a.createdAt),
  );
}

export function useVersion(id: ID | null) {
  return useQuery({
    queryKey: queryKeys.versions.detail(id ?? ""),
    queryFn: () => fetchVersion(id!),
    enabled: id != null,
  });
}
