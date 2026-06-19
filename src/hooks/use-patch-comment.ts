import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Comment, ID } from "../types";
import { queryKeys } from "../lib/queryKeys";

export type CommentPatch = Partial<Omit<Comment, "id">>;

export function usePatchComment(
  mutationFn: (args: { id: ID; patch: CommentPatch }) => Promise<Comment>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async ({ id, patch }: { id: ID; patch: CommentPatch }) => {
      await qc.cancelQueries({ queryKey: queryKeys.comments.all });

      const previousComments = qc.getQueriesData<Comment[]>({
        queryKey: queryKeys.comments.lists(),
      });
      const previousCommentDetail = qc.getQueryData(
        queryKeys.comments.detail(id),
      );

      qc.setQueriesData<Comment[]>(
        { queryKey: queryKeys.comments.lists() },
        (old) => old?.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      );
      qc.setQueryData<Comment>(queryKeys.comments.detail(id), (c) =>
        c?.id === id ? { ...c, ...patch } : c,
      );

      return { previousComments, previousCommentDetail };
    },
    onError: (_error, vars, ctx) => {
      ctx?.previousComments.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
      if (ctx?.previousCommentDetail)
        qc.setQueryData(
          queryKeys.comments.detail(vars.id),
          ctx.previousCommentDetail,
        );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.comments.all });
    },
  });
}
