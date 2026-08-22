import { useDatabaseContext } from "../nodes/database-context";

export function useChipVisibility() {
  const { showFilterChips, showSortChips } = useDatabaseContext();

  return { showFilterChips, showSortChips };
}
