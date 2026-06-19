import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Comment, ID, Thread } from "../types";
import { deleteThread } from "../api/threads";
import { deleteComment, fetchComments } from "../api/comments";
import { queryKeys } from "../lib/queryKeys";

export function useDeleteThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: ID }) => {
      const allComments = await fetchComments();
      const toDelete = allComments.filter((c) => c.threadId === id);
      await Promise.all(toDelete.map((c) => deleteComment(c.id)));
      await deleteThread(id);
    },
    onMutate: async ({ id }: { id: ID }) => {
      await qc.cancelQueries({ queryKey: queryKeys.comments.all });
      await qc.cancelQueries({ queryKey: queryKeys.threads.all });

      const previousThreadList = qc.getQueriesData<Thread[]>({
        queryKey: queryKeys.threads.lists(),
      });
      const previousCommentList = qc.getQueriesData<Comment[]>({
        queryKey: queryKeys.comments.lists(),
      });

      const deletedCommentIds = new Set(
        previousCommentList
          .flatMap(([, comments]) =>
            (comments ?? []).filter((c) => c.threadId === id),
          )
          .map((c) => c.id),
      );

      qc.setQueriesData<Comment[]>(
        { queryKey: queryKeys.comments.lists() },
        (comments) =>
          (comments ?? []).filter((c) => !deletedCommentIds.has(c.id)),
      );
      qc.setQueriesData<Thread[]>(
        { queryKey: queryKeys.threads.lists() },
        (threads) => (threads ?? []).filter((t) => t.id !== id),
      );

      return { previousThreadList, previousCommentList, deletedCommentIds };
    },
    onSuccess: (_data, { id }, ctx) => {
      if (ctx) {
        ctx.deletedCommentIds.forEach((cId) =>
          qc.removeQueries({ queryKey: queryKeys.comments.detail(cId) }),
        );
        qc.removeQueries({ queryKey: queryKeys.threads.detail(id) });
      }
    },
    onError: (_error, _vars, ctx) => {
      ctx?.previousCommentList.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
      ctx?.previousThreadList.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.comments.all });
      qc.invalidateQueries({ queryKey: queryKeys.threads.all });
    },
  });
}
