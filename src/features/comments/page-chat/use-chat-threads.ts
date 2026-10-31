import { useMemo } from "react";
import type { ID, Thread } from "src/types";
import { useThreadsByPage } from "src/hooks/use-threads";
import { useThreadStartTimes } from "src/hooks/use-comments";

/** The page's threads in chat order: by their first comment, oldest first.
 *  Drafts, deleted threads and threads with no comment yet are left out. */
export function useChatThreads(pageId: ID | null): Thread[] {
  const { data: threads = [] } = useThreadsByPage(pageId);
  const { data: starts } = useThreadStartTimes();
  return useMemo(() => {
    if (!starts) return [];
    return threads
      .filter(
        (th) =>
          th.status !== "drafted" &&
          th.status !== "deleted" &&
          starts.has(th.id),
      )
      .sort((a, b) => starts.get(a.id)! - starts.get(b.id)!);
  }, [threads, starts]);
}
