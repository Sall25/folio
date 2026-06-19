import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Comment, ID } from "../types";
import { createComment } from "../api/comments";
import { queryKeys } from "../lib/queryKeys";

export function useCreateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ comment }: { comment: Comment; threadId: ID }) => {
      return createComment(comment); // comment.threadId is the link; no thread patch
    },
    onMutate: async ({ comment }: { comment: Comment; threadId: ID }) => {
      await qc.cancelQueries({ queryKey: queryKeys.comments.all });

      const previousCommentList = qc.getQueriesData<Comment[]>({
        queryKey: queryKeys.comments.lists(),
      });

      qc.setQueriesData<Comment[]>(
        { queryKey: queryKeys.comments.lists() },
        (comments) => (comments ? [...comments, comment] : comments),
      );

      return { previousCommentList };
    },
    onError: (_error, _vars, ctx) => {
      ctx?.previousCommentList.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.comments.all });
    },
  });
}
