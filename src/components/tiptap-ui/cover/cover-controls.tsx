/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useRef } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { CoverPickerCard } from "./cover-picker-card";
import type { Page } from "src/types";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";

// ============================================================
// CoverControlsGroup
// ============================================================

export default function CoverControlsGroup({
  page,
  btnPosition,
  onRemoveCoverAsync,
  onCoverImageChange,
  handlePositionChange: handlePositionChangeProp,
  handlePositionDragEndAsync,
  popoverOpen,
  onPopoverOpenChange,
}: {
  page: Page;
  btnPosition: { top: number; right: number };
  onRemoveCoverAsync: () => Promise<void>;
  handlePositionChange?: (y: number) => void;
  onCoverImageChange?: (url: string) => void;
  handlePositionDragEndAsync?: () => Promise<void>;
  popoverOpen: boolean;
  onPopoverOpenChange: (open: boolean) => void;
}) {
  const [positionY, setPositionY] = useState(50);
  const [, setCoverPickerOpen] = useState(false);
  const { mutateAsync } = usePatchPage(({ id, patch }) => patchPage(id, patch));
  const mutateAsyncRef = useRef(mutateAsync);
  const [coverImage, setCoverImage] = useState(page.cover.coverImage);

  const onChangeCover = () => {
    setCoverPickerOpen(true);
    onPopoverOpenChange(true);
  };

  const handlePositionChange = useCallback(
    async (y: number) => {
      setPositionY(y);
      handlePositionChangeProp?.(y);
    },
    [handlePositionChangeProp],
  );

  const handleCoverImageChange = useCallback(
    async (url: string) => {
      setCoverPickerOpen(false);
      setCoverImage(url);
      onCoverImageChange?.(url);
      const next = { ...page.cover, coverImage: url } as any;
      delete next.gradient;
      await mutateAsyncRef.current({ id: page.id, patch: { cover: next } });
    },
    [page, onCoverImageChange],
  );

  const handleGradientChange = useCallback(
    async (gradient: string) => {
      const next = { ...page.cover, coverImage: null, gradient } as any;
      await mutateAsyncRef.current({ id: page.id, patch: { cover: next } });
    },
    [page],
  );

  return createPortal(
    <ButtonGroup
      orientation="horizontal"
      style={{
        position: "fixed",
        top: btnPosition.top,
        right: "20px",
        display: "flex",
        gap: 10,
        zIndex: 99999,
        border: "1px solid var(--tt-border-color)",
        background: "var(--action-buttons-bg-color)",
        borderRadius: "var(--tt-radius-sm)",
        fontSize: 12,
        padding: "2px 5px",
        minWidth: 200,
        height: 28,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Popover open={popoverOpen} onOpenChange={onPopoverOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            style={{
              fontSize: "inherit",
              background: "transparent",
              margin: 0,
              padding: 0,
              cursor: "pointer",
            }}
            onClick={onChangeCover}
          >
            <Pencil size={11} />
            <span>Change cover</span>
          </Button>
        </PopoverTrigger>
        <PopoverPortal container={document.getElementById("#root")}>
          <PopoverContent style={{ zIndex: 9999 }}>
            <CoverPickerCard
              coverImage={coverImage}
              positionY={positionY}
              onCoverImageChange={handleCoverImageChange}
              onPositionChange={handlePositionChange}
              onGradientChange={handleGradientChange}
              handlePositionDragEndAsync={handlePositionDragEndAsync}
            />
          </PopoverContent>
        </PopoverPortal>
      </Popover>
      <Separator orientation="vertical" />
      <Button
        variant="ghost"
        style={{
          fontSize: "inherit",
          background: "transparent",
          margin: 0,
          padding: 0,
          cursor: "pointer",
        }}
        onClick={async () => await onRemoveCoverAsync()}
      >
        <Trash2 size={12} />
        <span>Remove</span>
      </Button>
    </ButtonGroup>,
    document.body,
  );
}
