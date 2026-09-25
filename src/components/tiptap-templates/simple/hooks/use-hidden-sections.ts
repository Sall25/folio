import type { SidebarSectionKey } from "./use-sidebar-order";
import { useLocalStorage } from "./use-local-storage";
import { useCallback, useMemo } from "react";

export function useHiddenSections() {
  const [hiddenArr, setHiddenArr] = useLocalStorage<SidebarSectionKey[]>(
    "folio:hidden-sections",
    [],
  );
  // Set view for O(1) lookups; array is what persists.
  const hidden = useMemo(() => new Set(hiddenArr), [hiddenArr]);

  const toggleHidden = useCallback(
    (section: SidebarSectionKey) => {
      setHiddenArr((prev) =>
        prev.includes(section)
          ? prev.filter((c) => c !== section)
          : [...prev, section],
      );
    },
    [setHiddenArr],
  );

  return [hidden, toggleHidden] as const;
}
