import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Comment, Thread } from "../types";
import { createThread } from "../api/threads";
import { createComment } from "../api/comments";
import { queryKeys } from "../lib/queryKeys";

export function useSubmitThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      thread,
      comment,
    }: {
      thread: Thread;
      comment: Comment;
    }) => {
      await createThread(thread);
      return createComment(comment);
    },
    onMutate: async ({
      thread,
      comment,
    }: {
      thread: Thread;
      comment: Comment;
    }) => {
      await qc.cancelQueries({ queryKey: queryKeys.threads.all });
      await qc.cancelQueries({ queryKey: queryKeys.comments.all });

      const previousThreadList = qc.getQueriesData<Thread[]>({
        queryKey: queryKeys.threads.lists(),
      });
      const previousCommentList = qc.getQueriesData<Comment[]>({
        queryKey: queryKeys.comments.lists(),
      });

      qc.setQueriesData<Thread[]>(
        { queryKey: queryKeys.threads.lists() },
        (threads) => (threads ? [...threads, thread] : threads),
      );
      qc.setQueriesData<Comment[]>(
        { queryKey: queryKeys.comments.lists() },
        (comments) => (comments ? [...comments, comment] : comments),
      );

      return { previousThreadList, previousCommentList };
    },
    onError: (_error, _vars, ctx) => {
      ctx?.previousThreadList.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
      ctx?.previousCommentList.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.threads.all });
      qc.invalidateQueries({ queryKey: queryKeys.comments.all });
    },
  });
}
