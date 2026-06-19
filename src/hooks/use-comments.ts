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
