import { createContext } from "react";
import type { ThreadContextType } from "./threadContextType";

export const ThreadContext = createContext<ThreadContextType>({
  threads: [],
  selectedThreads: [],
  selectedThread: null
})

