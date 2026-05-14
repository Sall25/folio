import { useCallback, useEffect, useRef, useState } from "react";
import type { Target } from "src/components/tiptap-ui/cover/types";
import type { Page } from "../types";
import { useActivePage } from "../use-active-page";

export function useCoverActions(providedPage?: Page) {
  const { activePage, updateCoverAsync, addCoverAsync } = useActivePage();

  const page = providedPage ?? activePage;

  const activePageRef = useRef(page);
  const floatingRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Target>("Emoji");

  const targetRef = useRef(target);
  const updateCoverAsyncRef = useRef(updateCoverAsync);
  const addCoverAsyncRef = useRef(addCoverAsync);

  useEffect(() => {
    activePageRef.current = providedPage ?? activePage;
  }, [providedPage, activePage]);

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
  }, []);

  const onAddCoverAsync = useCallback(async () => {
    if (activePageRef.current?.id === undefined) return;
    await addCoverAsyncRef.current(activePageRef.current.id);
  }, []);

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
