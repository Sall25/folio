import type { HocuspocusProvider } from "@hocuspocus/provider";
import { createContext, useContext } from "react";

export const CollabProviderContext = createContext<HocuspocusProvider | null>(
  null,
);
export const useCollabProvider = () => useContext(CollabProviderContext);
