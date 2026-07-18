import { useRecordSelection } from "../utils/record-selection-store";
import { useMemo } from "react";

export function useVisibleSelection(
  databaseId: string | null,
  sortedRecordIds: string[],
) {
  const selected = useRecordSelection(databaseId);
  return useMemo(() => {
    const set = new Set(selected);
    return sortedRecordIds.filter((id) => set.has(id));
  }, [selected, sortedRecordIds]);
}
