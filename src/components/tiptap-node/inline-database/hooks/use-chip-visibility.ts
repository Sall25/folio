import { useDatabaseContext } from "../context/database-context";

export function useChipVisibility() {
  const { showFilterChips, showSortChips } = useDatabaseContext();

  return { showFilterChips, showSortChips };
}
