// use-cover-actions.ts
import { useCallback, useEffect, useRef, useState } from "react";
import type { Page } from "../types";
import type { Target } from "src/components/tiptap-ui/cover/types";

type UseCoverActionsProps = {
  activePage: Page;
  updateCover: (cover: Page["cover"]) => void;
  addCover: (id: string) => void;
};

export function useCoverActions({
  activePage,
  updateCover,
  addCover,
}: UseCoverActionsProps) {
  const activePageRef = useRef(activePage);
  const floatingRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Target>("Emoji");

  useEffect(() => {
    activePageRef.current = activePage;
  }, [activePage]);

  const onSelect = useCallback(
    (name: string, color?: string) => {
      setOpen(false);
      updateCover({
        ...activePageRef.current.cover,
        iconName: name,
        target,
        color,
      });
    },
    [updateCover, target],
  );

  const onAddCover = useCallback(
    () => addCover(activePageRef.current.id),
    [addCover],
  );

  return {
    activePageRef,
    floatingRef,
    open,
    setOpen,
    target,
    setTarget,
    onSelect,
    onAddCover,
  };
}
