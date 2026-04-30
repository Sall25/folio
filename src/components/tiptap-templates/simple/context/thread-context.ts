import { createContext, useContext } from "react";
import type { UseThreadsOnPageReturn } from "src/components/tiptap-ui/comments/hooks/use-threads-on-page";

type ThreadContextType = UseThreadsOnPageReturn | undefined;

export const ThreadContext = createContext<ThreadContextType | null>(null);

export function useThreadContext() {
  const ctx = useContext(ThreadContext);
  if (!ctx)
    throw new Error("useThreadContext must be used within ThreadProvider");
  return ctx;
}
