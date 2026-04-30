import type { ReactNode } from "react";
import type { UseThreadsOnPageReturn } from "src/components/tiptap-ui/comments/hooks/use-threads-on-page";
import { ThreadContext } from "./thread-context";

export function ThreadProvider({
  threads,
  children,
}: {
  threads: UseThreadsOnPageReturn;
  children: ReactNode;
}) {
  return (
    <ThreadContext.Provider value={threads}>{children}</ThreadContext.Provider>
  );
}
