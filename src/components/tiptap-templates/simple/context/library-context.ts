import { createContext, useContext } from "react";

export type LibraryContextType = {
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
};

export const LibraryContext = createContext<LibraryContextType>({
  open: false,
  onOpenChange() {},
});

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  return ctx;
}
