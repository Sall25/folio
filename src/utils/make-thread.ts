import { newId } from "src/lib/id";
import type { Thread, ID, ThreadStatus } from "src/types";

export function makeThread(opts: {
  pageId: ID;
  anchor: { from: number; to: number };
  status?: ThreadStatus;
}): Thread {
  return {
    id: newId(),
    pageId: opts.pageId,
    anchor: opts.anchor,
    status: opts.status ?? "open",
  };
}
