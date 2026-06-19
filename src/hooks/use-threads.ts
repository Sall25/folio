import { useQuery } from "@tanstack/react-query";
import type { Thread, ThreadStatus, ID } from "../types";
import { queryKeys } from "../lib/queryKeys";
import { fetchThreads, fetchThread } from "../api/threads";

// ─── the one base query ──────────────────────────────────────────────────────
export function useThreadsBase<T>(select?: (threads: Thread[]) => T) {
  return useQuery({
    queryKey: queryKeys.threads.lists(),
    queryFn: fetchThreads,
    select,
  });
}

// ─── lenses ──────────────────────────────────────────────────────────────────

// all threads for a page — the comment sidebar's query
export function useThreadsByPage(pageId: ID | null) {
  return useThreadsBase((threads) =>
    pageId == null ? [] : threads.filter((t) => t.pageId === pageId),
  );
}

// page threads narrowed by status — e.g. only open, or only resolved
export function useThreadsByPageAndStatus(
  pageId: ID | null,
  status: ThreadStatus,
) {
  return useThreadsBase((threads) =>
    pageId == null
      ? []
      : threads.filter((t) => t.pageId === pageId && t.status === status),
  );
}

// ─── detail ──────────────────────────────────────────────────────────────────
export function useThread(id: ID | null) {
  return useQuery({
    queryKey: queryKeys.threads.detail(id ?? ""),
    queryFn: () => fetchThread(id!),
    enabled: id != null,
  });
}
