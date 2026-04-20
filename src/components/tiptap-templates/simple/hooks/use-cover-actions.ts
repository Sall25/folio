// use-cover-actions.ts
import { useCallback, useEffect, useRef, useState } from "react";
import type { Page } from "../types";
import type { Target } from "src/components/tiptap-ui/cover/types";

type UseCoverActionsProps = {
  activePage: Page;
  updateCoverAsync: (cover: Page["cover"]) => Promise<void>;
  addCoverAsync: (id: string) => Promise<void>;
};

export function useCoverActions({
  activePage,
  updateCoverAsync,
  addCoverAsync,
}: UseCoverActionsProps) {
  const activePageRef = useRef(activePage);
  const floatingRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Target>("Emoji");

  useEffect(() => {
    activePageRef.current = activePage;
  }, [activePage]);

  const onSelectAsync = useCallback(
    async (name: string, color?: string) => {
      setOpen(false);
      await updateCoverAsync({
        ...activePageRef.current.cover,
        iconName: name,
        target,
        color,
      });
    },
    [updateCoverAsync, target],
  );

  const onAddCoverAsync = useCallback(
    async () => await addCoverAsync(activePageRef.current.id),
    [addCoverAsync],
  );

  return {
    activePageRef,
    floatingRef,
    open,
    setOpen,
    target,
    setTarget,
    onSelectAsync,
    onAddCoverAsync,
  };
}
