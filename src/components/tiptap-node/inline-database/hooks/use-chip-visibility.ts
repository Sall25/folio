import { useEffect, useRef, useState } from "react";

export function useChipVisibility(filterRuleCount: number, sortCount: number) {
  const [showFilterChips, setShowFilterChips] = useState(false);
  const [showSortChips, setShowSortChips] = useState(false);

  // Reveal the bar when rules appear, hide it when the last one goes.
  const prevCountsRef = useRef({ filters: 0, sorts: 0 });
  useEffect(() => {
    const prev = prevCountsRef.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (filterRuleCount > prev.filters) setShowFilterChips(true);
    if (filterRuleCount === 0) setShowFilterChips(false);
    if (sortCount > prev.sorts) setShowSortChips(true);
    if (sortCount === 0) setShowSortChips(false);
    prevCountsRef.current = { filters: filterRuleCount, sorts: sortCount };
  }, [filterRuleCount, sortCount]);

  return { showFilterChips, showSortChips };
}
