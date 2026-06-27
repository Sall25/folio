import { createContext, useContext } from "react";
import type { LibraryTab } from "../components/library-palette";

export type LibraryContextType = {
  activeTab: LibraryTab | null;
  setActiveTab: (tab: LibraryTab | null) => void;
};

export const LibraryContext = createContext<LibraryContextType>({
  activeTab: null,
  setActiveTab: () => {},
});

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  return ctx;
}
