import type { Comment, ID } from "src/types";
import { http } from "./client";
import { supabase } from "./supabase-client";

export const fetchComments = () => http<Comment[]>("/comments");

export const fetchComment = (id: ID) => http<Comment>(`/comments/${id}`);

export const fetchCommentsByThread = (threadId: ID) =>
  http<Comment[]>(`/comments?threadId=${encodeURIComponent(threadId)}`);

export const deleteComment = (id: ID) =>
  http<void>(`/comments/${id}`, { method: "DELETE" });

export const patchComment = (id: ID, patch: Partial<Comment>) =>
  http<Comment>(`/comments/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ ...patch }),
  });

export const createComment = (comment: Comment) => {
  return http<Comment>(`/comments`, {
    method: "POST",
    body: JSON.stringify(comment),
  });
};

export async function toggleCommentReaction(commentId: ID, emoji: string) {
  const { data, error } = await supabase.rpc("toggle_comment_reaction", {
    p_comment_id: commentId,
    p_emoji: emoji,
  });
  if (error) throw error;
  return data as Record<string, string[]>;
}
