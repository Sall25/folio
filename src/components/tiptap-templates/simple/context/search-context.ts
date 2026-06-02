import { createContext, useContext } from "react";

export type SearchContextType = {
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
};

export const SearchContext = createContext<SearchContextType>({
  open: false,
  onOpenChange() {},
});

export function useSearch() {
  const ctx = useContext(SearchContext);
  return ctx;
}
