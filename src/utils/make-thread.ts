import { newId } from "src/lib/id";
import type { Thread, ID, ThreadStatus } from "src/types";

export function makeThread(opts: {
  id?: ID;
  pageId: ID;
  anchor: { from: number; to: number } | null;
  status?: ThreadStatus;
}): Thread {
  return {
    id: opts.id ?? newId(),
    pageId: opts.pageId,
    anchor: opts.anchor,
    status: opts.status ?? "open",
  };
}
