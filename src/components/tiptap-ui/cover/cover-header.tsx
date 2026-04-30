/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Pencil, Trash2 } from "lucide-react";
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
import { CoverPickerCard } from "./cover-picker-card";
import { useSimpleEditor } from "src/components/tiptap-templates/simple/context/simple-editor-context";
import { createPortal } from "react-dom";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { useActivePageContext } from "src/components/tiptap-templates/simple/context/active-page-context";

function CoverControlsGroup({
  btnPosition,
  onRemoveCoverAsync,
  onCoverImageChange,
  handlePositionChange: handlePositionChangeProp,
  handlePositionDragEndAsync,
  popoverOpen,
  onPopoverOpenChange,
}: {
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
  const { activePage, updateCoverAsync } = useSimpleEditor();
  const [coverImage, setCoverImage] = useState(activePage?.cover.coverImage);

  const onChangeCover = () => {
    setCoverPickerOpen(true);
    onPopoverOpenChange(true);
  };
  const handlePositionChange = useCallback(
    async (y: number) => {
      if (!activePage) return;
      setPositionY(y);
      handlePositionChangeProp?.(y);
    },
    [activePage, handlePositionChangeProp],
  );

  const handleCoverImageChange = useCallback(
    async (url: string) => {
      if (!activePage) return;
      setCoverPickerOpen(false);
      setCoverImage(url);
      onCoverImageChange?.(url);
      const next = { ...activePage.cover, coverImage: url } as any;
      delete next.gradient;
      await updateCoverAsync(next);
    },
    [updateCoverAsync, activePage, onCoverImageChange],
  );

  const handleGradientChange = useCallback(
    async (gradient: string) => {
      if (!activePage) return;
      const next = { ...activePage.cover, coverImage: null, gradient } as any;
      await updateCoverAsync(next);
    },
    [updateCoverAsync, activePage],
  );

  if (!activePage) return null;

  return createPortal(
    <ButtonGroup
      orientation="horizontal"
      style={{
        position: "fixed",
        top: btnPosition.top,
        right: btnPosition.right,
        display: "flex",
        gap: 10,
        zIndex: 9999,
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

// ============================================================
// CoverImage
// ============================================================
export function CoverImage({
  onRemoveCoverAsync,
}: {
  onRemoveCoverAsync: () => Promise<void>;
}) {
  const { activePage, updateCoverAsync } = useSimpleEditor();
  const [btnPosition, setBtnPosition] = useState({ top: 0, right: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const [coverImage, setCoverImage] = useState(activePage?.cover.coverImage);
  const [localPositionY, setLocalPositionY] = useState(
    (activePage?.cover as any)?.positionY ?? 50,
  );
  const [popoverOpen, setPopoverOpen] = useState(false);

  const onPopoverOpenChange = useCallback(
    (open: boolean) => setPopoverOpen(open),
    [],
  );

  const onCoverImageChange = useCallback(
    (url: string) => setCoverImage(url),
    [],
  );
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setBtnPosition({
        top: 60,
        right: window.innerWidth - rect.right + 24,
      });
    }
  }, []);

  // Fast — just updates local state, no async
  const handlePositionChange = useCallback(
    (y: number) => setLocalPositionY(y),
    [],
  );

  // Slow — only fires on mouse up
  const handlePositionDragEnd = useCallback(async () => {
    if (!activePage) return;
    await updateCoverAsync({ ...activePage.cover, positionY: localPositionY });
  }, [updateCoverAsync, activePage, localPositionY]);

  if (!activePage) return null;

  const showControls = hovering || popoverOpen;

  return (
    <div
      className="cover-image-root"
      ref={containerRef}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <style>{`
        .cover-image-root {
          position: relative;
          width: 100%;
          height: 200px;
          overflow: hidden;
        }
        .cover-image-root img {
          width: 100%;
          height: 200%;
          object-fit: cover;
          display: block;
          position: absolute;
          left: 0;
        }
      `}</style>

      <img
        src={coverImage ?? ""}
        alt="cover"
        draggable={false}
        style={{ top: `${-(localPositionY / 100) * 50}%` }}
      />

      {showControls && (
        <CoverControlsGroup
          btnPosition={btnPosition}
          onRemoveCoverAsync={onRemoveCoverAsync}
          handlePositionChange={handlePositionChange}
          handlePositionDragEndAsync={handlePositionDragEnd}
          onCoverImageChange={onCoverImageChange}
          popoverOpen={popoverOpen}
          onPopoverOpenChange={onPopoverOpenChange}
        />
      )}
    </div>
  );
}

// ============================================================
// GradientCover
// ============================================================

function GradientCover({
  gradient,
  onRemoveCoverAsync,
}: {
  gradient: string;
  onRemoveCoverAsync: () => Promise<void>;
}) {
  const [btnPosition, setBtnPosition] = useState({ top: 0, right: 0 });
  const [hovering, setHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const onPopoverOpenChange = useCallback(
    (open: boolean) => setPopoverOpen(open),
    [],
  );

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setBtnPosition({
        top: 60,
        right: window.innerWidth - rect.right + 24,
      });
    }
  }, []);
  const { activePage } = useSimpleEditor();

  const showControls = hovering || popoverOpen;

  if (!activePage) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: 200,
        background: gradient,
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {showControls && (
        <CoverControlsGroup
          btnPosition={btnPosition}
          onRemoveCoverAsync={onRemoveCoverAsync}
          popoverOpen={popoverOpen}
          onPopoverOpenChange={onPopoverOpenChange}
        />
      )}
    </div>
  );
}

// ============================================================
// IconButton
// ============================================================
function IconButton({
  open,
  onOpenChange,
  target,
  onTargetChange,
  paddingLeft,
  translateX,
  hasThreads,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: Target;
  onTargetChange: (t: Target) => void;
  paddingLeft: number;
  translateX: number;
  hasThreads?: boolean;
}) {
  const { activePage, updateCoverAsync } = useSimpleEditor();
  const { activePageId } = useActivePageContext();
  const hasCoverImage = !!activePage?.cover.coverImage;

  const hasGradient = !!(activePage?.cover as any).gradient;
  const hasCover = hasCoverImage || hasGradient;

  // Syncs automatically on page switch — no effect needed
  const cover = useMemo(
    () => activePage?.cover,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activePageId, activePage],
  );

  // Only for optimistic local update after icon select
  const [optimisticCover, setOptimisticCover] = useState<
    Page["cover"] | undefined
  >();

  // Use optimistic if available, fall back to real
  const displayCover = optimisticCover ?? cover;

  const onSelectIconAsync = useCallback(
    async (name: string, color?: string) => {
      if (!activePage || !cover) return;
      // Optimistic update — feels instant
      setOptimisticCover({ ...cover, iconName: name, color, target });
      await updateCoverAsync({
        ...activePage.cover,
        iconName: name,
        target,
        color,
      });
      // Clear optimistic after persist — real data takes over
      setOptimisticCover(undefined);
    },
    [updateCoverAsync, activePage, target, cover],
  );

  // Clear optimistic on page switch
  useEffect(() => {
    setOptimisticCover(undefined);
  }, [activePageId]);

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
}

export function CoverHeader({
  paddingLeft,
  translateX,
  hasThreads,
}: CoverHeaderProps) {
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  const [target, setTarget] = useState<Target>("Emoji");

  const { updateCoverAsync, activePage } = useSimpleEditor();

  const hasIcon = !!activePage?.cover.iconName;
  const hasCoverImage = !!activePage?.cover.coverImage;
  // Gradient stored on cover.gradient (extend your Page type if needed)
  const hasGradient = !!activePage?.cover.gradient;

  const handleRemoveCover = useCallback(async () => {
    const next = { ...activePage?.cover, coverImage: null } as any;
    delete next.gradient;
    await updateCoverAsync(next);
  }, [updateCoverAsync, activePage]);

  return (
    <div
      className="cover-header-wrapper"
      style={{ width: "100%", position: "relative", minHeight: 60 }}
    >
      {/* ── Cover display ── */}
      {hasCoverImage && <CoverImage onRemoveCoverAsync={handleRemoveCover} />}

      {hasGradient && !hasCoverImage && (
        <GradientCover
          gradient={(activePage?.cover as any).gradient}
          onRemoveCoverAsync={handleRemoveCover}
        />
      )}

      {/* ── Icon button ── */}
      {hasIcon && (
        <IconButton
          open={iconPickerOpen}
          onOpenChange={setIconPickerOpen}
          target={target}
          onTargetChange={setTarget}
          paddingLeft={paddingLeft}
          translateX={translateX}
          hasThreads={hasThreads}
        />
      )}
    </div>
  );
}
