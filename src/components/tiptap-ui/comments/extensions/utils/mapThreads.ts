import type { Transaction } from "@tiptap/pm/state";
import type { Thread } from "src/types";

export function mapThreads(tr: Transaction, threads: Thread[]) {
  for (const t of threads) {
    if (!t.anchor) {
      console.warn("thread missing anchor", t);
      continue;
    }
    const nextFrom = tr.mapping.mapResult(t.anchor.from);
    const nextTo = tr.mapping.mapResult(t.anchor.to);
    if (nextFrom.deleted || nextTo.deleted) {
      t.status = "deleted";
    } else {
      t.anchor.from = nextFrom.pos;
      t.anchor.to = nextTo.pos;
    }
  }
  return threads;
}
