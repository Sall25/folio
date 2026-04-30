import { useCallback, useEffect, useRef, useState } from "react";
import type { Target } from "src/components/tiptap-ui/cover/types";
import { useSimpleEditor } from "../context/simple-editor-context";

export function useCoverActions() {
  const { activePage, updateCoverAsync, addCoverAsync } = useSimpleEditor();

  const activePageRef = useRef(activePage);
  const floatingRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Target>("Emoji");

  const targetRef = useRef(target);
  const updateCoverAsyncRef = useRef(updateCoverAsync);
  const addCoverAsyncRef = useRef(addCoverAsync);

  useEffect(() => {
    activePageRef.current = activePage;
  }, [activePage]);
  useEffect(() => {
    targetRef.current = target;
  }, [target]);
  useEffect(() => {
    updateCoverAsyncRef.current = updateCoverAsync;
  }, [updateCoverAsync]);
  useEffect(() => {
    addCoverAsyncRef.current = addCoverAsync;
  }, [addCoverAsync]);

  const onSelectAsync = useCallback(async (name: string, color?: string) => {
    if (!activePageRef.current) return;
    setOpen(false);
    await updateCoverAsyncRef.current({
      ...activePageRef.current.cover,
      iconName: name,
      target: targetRef.current,
      color,
    });
  }, []); // stable forever

  const onAddCoverAsync = useCallback(async () => {
    if (!activePageRef.current?.id) return;
    await addCoverAsyncRef.current(activePageRef.current.id);
  }, []); // stable forever

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
