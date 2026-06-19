import { createContext } from "react";
import type { ThreadContextType } from "./threadContextType";

export const ThreadContext = createContext<ThreadContextType>({
  threads: [],
  selectedThread: null,
  positionedThreads: [],
  onMapThreads: () => {},
  onMeasureAllThreads: () => {},
  onResolveActiveThreadCollisions: () => {},
  onResolveThreadCollisions: () => {},
  onSelectedThreadChange: () => {},
  requestReflow: () => {},
});
