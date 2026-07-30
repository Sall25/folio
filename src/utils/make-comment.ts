import { newId } from "src/lib/id";
import type { Comment, ID } from "src/types";

export function makeComment(opts: {
  id?: ID;
  threadId: ID;
  text: string;
  authorId: ID;
}): Comment {
  return {
    id: opts.id ?? newId(),
    threadId: opts.threadId,
    body: opts.text,
    createdAt: Date.now(),
    updatedAt: null,
    personId: opts.authorId,
  };
}
