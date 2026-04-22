// use-cover-actions.ts
import { useCallback, useEffect, useRef, useState } from "react";
import type { Target } from "src/components/tiptap-ui/cover/types";
import { useSimpleEditor } from "../context/simple-editor-context";

export function useCoverActions() {
  const { activePage, updateCoverAsync, addCoverAsync } = useSimpleEditor();
  const activePageRef = useRef(activePage);
  const floatingRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Target>("Emoji");

  useEffect(() => {
    activePageRef.current = activePage;
  }, [activePage]);

  const onSelectAsync = useCallback(
    async (name: string, color?: string) => {
      if (!activePageRef.current) return;
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

  const onAddCoverAsync = useCallback(async () => {
    if (!activePageRef.current || !activePageRef.current.id) return;
    await addCoverAsync(activePageRef.current.id);
  }, [addCoverAsync]);

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
