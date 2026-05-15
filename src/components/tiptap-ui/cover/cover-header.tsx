/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect, useMemo } from "react";
import { DynamicIcon } from "./dynamic-icon";
import "./cover-header.scss";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import type { Target } from "./types";
import type { Page } from "src/components/tiptap-templates/simple/types";
import { IconPickerCard } from "./icon-picker-card";
import { useActivePage } from "src/components/tiptap-templates/simple/use-active-page";
import CoverImage from "./cover-image";
import GradientCover from "./gradient-cover";

function IconButton({
  open,
  onOpenChange,
  target,
  onTargetChange,
  paddingLeft,
  translateX,
  hasThreads,
  page,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: Target;
  onTargetChange: (t: Target) => void;
  paddingLeft: number;
  translateX: number;
  hasThreads?: boolean;
  page: Page;
}) {
  const { activePageId, isLoading } = useActivePage();

  const hasCoverImage = !!page.cover.coverImage;
  const hasGradient = !!(page.cover as any).gradient;
  const hasCover = hasCoverImage || hasGradient;

  const cover = useMemo(
    () => page.cover,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activePageId, page, isLoading],
  );

  const [optimisticCover, setOptimisticCover] = useState<
    Page["cover"] | undefined
  >();

  useEffect(() => {
    setOptimisticCover(undefined);
  }, [activePageId]);

  const displayCover = optimisticCover ?? cover;
  const { updatePageAsync } = useActivePage();

  const onSelectIconAsync = useCallback(
    async (name: string, color?: string) => {
      if (!cover) return;
      await updatePageAsync({
        ...page,
        cover: { ...page.cover, iconName: name, target, color },
      });
    },
    [updatePageAsync, page, target, cover],
  );

  return (
    <div
      style={{
        paddingTop: hasCover ? 0 : 24,
        paddingLeft,
        transform: hasThreads ? `translateX(${translateX}px)` : "translateX(0)",
        maxWidth: 400,
      }}
    >
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <button
            className="cover-icon-btn"
            style={{
              fontSize: 60,
              marginTop: hasCover ? -60 : 0,
              color: displayCover?.color ?? "var(--tt-text-color)",
            }}
          >
            {displayCover?.target === "Emoji" && displayCover?.iconName}
            {displayCover?.target === "Icons" && (
              <DynamicIcon
                name={displayCover.iconName!}
                stroke={displayCover.color ?? "var(--tt-text-color)"}
                size={85}
                strokeWidth={2}
              />
            )}
          </button>
        </PopoverTrigger>
        <PopoverPortal container={document.getElementById("root")}>
          <PopoverContent
            style={{ position: "fixed", zIndex: 999 }}
            side="bottom"
            align="start"
          >
            <IconPickerCard
              target={target}
              onTargetChange={onTargetChange}
              onSelect={onSelectIconAsync}
            />
          </PopoverContent>
        </PopoverPortal>
      </Popover>
    </div>
  );
}

// ============================================================
// CoverHeader
// ============================================================

interface CoverHeaderProps {
  sidebarWidth: number;
  collapsed: boolean;
  paddingLeft: number;
  translateX: number;
  hasThreads?: boolean;
  providedPage?: Page;
}

export function CoverHeader({
  paddingLeft,
  translateX,
  hasThreads,
  providedPage,
}: CoverHeaderProps) {
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  const [target, setTarget] = useState<Target>("Emoji");

  const { updatePageAsync, activePage } = useActivePage();

  const page = providedPage ?? activePage;

  const hasIcon = !!page?.cover.iconName;
  const hasCoverImage = !!page?.cover.coverImage;
  const hasGradient = !!page?.cover.gradient;

  const handleRemoveCover = useCallback(async () => {
    if (!page) return;
    const next = { ...page.cover, coverImage: null } as any;
    delete next.gradient;
    await updatePageAsync({ ...page, cover: next });
  }, [updatePageAsync, page]);

  return (
    <div
      className="cover-header-wrapper"
      style={{ width: "100%", position: "relative", minHeight: 60 }}
    >
      {/* ── Cover display ── */}
      {hasCoverImage && (
        <CoverImage page={page} onRemoveCoverAsync={handleRemoveCover} />
      )}{" "}
      {hasGradient && !hasCoverImage && (
        <GradientCover
          page={page}
          gradient={(page?.cover as any).gradient}
          onRemoveCoverAsync={handleRemoveCover}
        />
      )}
      {/* ── Icon button ── */}
      {hasIcon && page && (
        <IconButton
          open={iconPickerOpen}
          onOpenChange={setIconPickerOpen}
          target={target}
          onTargetChange={setTarget}
          paddingLeft={paddingLeft}
          translateX={translateX}
          hasThreads={hasThreads}
          page={page}
        />
      )}
    </div>
  );
}
