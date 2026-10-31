import { useQuery } from "@tanstack/react-query";
import type { Comment, ID } from "../types";
import { queryKeys } from "../lib/queryKeys";
import { fetchComments, fetchComment } from "../api/comments";

function useCommentsBase<T>(select?: (comments: Comment[]) => T) {
  return useQuery({
    queryKey: queryKeys.comments.lists(),
    queryFn: fetchComments,
    select,
  });
}

// comments of a thread, oldest first (conversation order).
// [...] copy before sort — sort mutates, and the input IS the cache.
export function useCommentsByThread(threadId: ID | null) {
  return useCommentsBase((comments) =>
    threadId == null
      ? []
      : [...comments]
          .filter((c) => c.threadId === threadId)
          .sort((a, b) => a.createdAt - b.createdAt),
  );
}

export function useComment(id: ID | null) {
  return useQuery({
    queryKey: queryKeys.comments.detail(id ?? ""),
    queryFn: () => fetchComment(id!),
    enabled: id != null,
  });
}

// When each thread started (its first comment), for ordering threads by
// time (the page chat). Threads with no comment yet aren't in the map.
// A stable function, so React Query keeps the result between renders.
function toThreadStarts(comments: Comment[]): Map<ID, number> {
  const starts = new Map<ID, number>();
  for (const c of comments) {
    const prev = starts.get(c.threadId);
    if (prev === undefined || c.createdAt < prev) {
      starts.set(c.threadId, c.createdAt);
    }
  }
  return starts;
}

export function useThreadStartTimes() {
  return useCommentsBase(toThreadStarts);
}
