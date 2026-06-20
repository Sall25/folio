import { useCallback, useEffect, useRef, useState } from "react";
import type { Target } from "src/components/tiptap-ui/cover/types";
import type { Page } from "src/types";
import { useActivePage } from "../context/active-page-context";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";

export function useCoverActions(providedPage?: Page) {
  const { activePage } = useActivePage();

  const page = providedPage ?? activePage;

  const activePageRef = useRef(page);
  const floatingRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Target>("Emoji");
  const { mutateAsync } = usePatchPage(({ id, patch }) => patchPage(id, patch));

  const targetRef = useRef(target);

  useEffect(() => {
    activePageRef.current = providedPage ?? activePage;
  }, [providedPage, activePage]);

  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  const onSelectAsync = useCallback(
    async (name: string, color?: string) => {
      if (!activePageRef.current) return;
      setOpen(false);
      await mutateAsync({
        id: activePageRef.current.id,
        patch: {
          cover: {
            ...activePageRef.current.cover,
            iconName: name,
            target: targetRef.current,
            color: color ?? null,
          },
        },
      });
    },
    [mutateAsync],
  );

  const onAddCoverAsync = useCallback(async () => {
    if (activePageRef.current?.id === undefined) return;
    await mutateAsync({
      id: activePageRef.current.id,
      patch: {
        cover: {
          ...activePageRef.current.cover,
          coverImage: "/covers/default-cover.jpg",
        },
      },
    });
  }, [mutateAsync]);

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
