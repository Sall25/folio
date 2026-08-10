import type { PageCategory } from "src/types";
import { useLocalStorage } from "./use-local-storage";
import { useCallback, useMemo } from "react";
export function useHiddenSections() {
  const [hiddenArr, setHiddenArr] = useLocalStorage<PageCategory[]>(
    "folio:hidden-sections",
    [],
  );
  // Set view for O(1) lookups; array is what persists.
  const hidden = useMemo(() => new Set(hiddenArr), [hiddenArr]);

  const toggleHidden = useCallback(
    (category: PageCategory) => {
      setHiddenArr((prev) =>
        prev.includes(category)
          ? prev.filter((c) => c !== category)
          : [...prev, category],
      );
    },
    [setHiddenArr],
  );

  return [hidden, toggleHidden] as const;
}
