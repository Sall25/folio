import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteComment } from "../api/comments";
import type { Comment, ID } from "../types";
import { queryKeys } from "../lib/queryKeys";

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: ID) => {
      await deleteComment(id);
    },
    onMutate: async (id: ID) => {
      await qc.cancelQueries({ queryKey: queryKeys.comments.all });

      const previousCommentList = qc.getQueriesData<Comment[]>({
        queryKey: queryKeys.comments.lists(),
      });

      // remove the one comment from the comments cache
      qc.setQueriesData<Comment[]>(
        { queryKey: queryKeys.comments.lists() },
        (comments) => (comments ?? []).filter((c) => c.id !== id),
      );

      return { previousCommentList };
    },
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: queryKeys.comments.detail(id) });
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
