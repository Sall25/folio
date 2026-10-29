import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Comment, ID, Reactions } from "../types";
import { queryKeys } from "../lib/queryKeys";
import { toggleCommentReaction } from "../api/comments";

// One reaction on or off for the signed-in person. The cache shows the new
// map straight away (`next`, computed by the card); the server gets only the
// emoji and toggles it itself (toggle_comment_reaction, migration 047), so
// it works on other people's comments and simultaneous reactions don't
// overwrite each other.
export function useToggleCommentReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, emoji }: { id: ID; emoji: string; next: Reactions }) =>
      toggleCommentReaction(id, emoji),

    onMutate: async ({ id, next }) => {
      await qc.cancelQueries({ queryKey: queryKeys.comments.all });
      const previousComments = qc.getQueriesData<Comment[]>({
        queryKey: queryKeys.comments.lists(),
      });
      qc.setQueriesData<Comment[]>(
        { queryKey: queryKeys.comments.lists() },
        (old) => old?.map((c) => (c.id === id ? { ...c, reactions: next } : c)),
      );
      return { previousComments };
    },

    onError: (_error, _vars, ctx) => {
      ctx?.previousComments.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
    },

    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.comments.all });
    },
  });
}
