/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect, useRef } from "react";
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

// ============================================================
// CoverImage
// ============================================================
export function CoverImage({
  coverImage,
  onRemoveCoverAsync,
}: {
  coverImage: string;
  onRemoveCoverAsync: () => Promise<void>;
}) {
  const [positionY, setPositionY] = useState(50);
  const [, setCoverPickerOpen] = useState(false);
  const { activePage, updateCoverAsync } = useSimpleEditor();
  const [popoverOpen, setPopoverOpen] = useState(false);

  const onChangeCover = () => setCoverPickerOpen(true);
  const handlePositionChange = useCallback(
    async (y: number) => {
      if (!activePage) return;
      setPositionY(y);
      // Debounce persistence in real usage — for now update immediately
      await updateCoverAsync({ ...activePage.cover, positionY: y });
    },
    [updateCoverAsync, activePage],
  );

  const handleCoverImageChange = useCallback(
    async (url: string) => {
      if (!activePage) return;
      setCoverPickerOpen(false);
      const next = { ...activePage.cover, coverImage: url } as any;
      delete next.gradient;
      await updateCoverAsync(next);
    },
    [updateCoverAsync, activePage],
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

  return (
    <div className="cover-image-root">
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
        .cover-image-actions {
          position: absolute;
          top: 12px;
          right: 24px;
          display: flex;
          gap: 6px;
          opacity: 0;
          transform: translateY(4px);
          transition: opacity 0.15s, transform 0.15s;
          z-index: 990;
        }
        .cover-image-root:hover .cover-image-actions {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      <img
        src={coverImage}
        alt="cover"
        draggable={false}
        style={{ top: `${-(positionY / 100) * 50}%` }}
      />

      <div className="cover-image-actions">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button className="cover-action-btn" onClick={onChangeCover}>
              <Pencil size={12} /> Change cover
            </button>
          </PopoverTrigger>
          <PopoverPortal container={document.getElementById("#root")}>
            <PopoverContent style={{ zIndex: 9999 }}>
              <CoverPickerCard
                coverImage={activePage.cover.coverImage}
                positionY={(activePage.cover as any).positionY ?? positionY}
                onCoverImageChange={handleCoverImageChange}
                onPositionChange={handlePositionChange}
                onGradientChange={handleGradientChange}
              />
            </PopoverContent>
          </PopoverPortal>
        </Popover>
        <button
          className="cover-action-btn cover-action-btn--danger"
          onClick={async () => await onRemoveCoverAsync()}
        >
          <Trash2 size={12} /> Remove
        </button>
      </div>
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
  const [positionY, setPositionY] = useState(50);
  const [hovering, setHovering] = useState(false);
  const [btnPosition, setBtnPosition] = useState({ top: 0, right: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setBtnPosition({
        top: 56,
        right: window.innerWidth - rect.right + 24,
      });
    }
    setHovering(true);
  };
  const [, setCoverPickerOpen] = useState(false);
  const { activePage, updateCoverAsync } = useSimpleEditor();
  const [popoverOpen, setPopoverOpen] = useState(false);

  const onChangeCover = () => setCoverPickerOpen(true);
  const handlePositionChange = useCallback(
    async (y: number) => {
      if (!activePage) return;
      setPositionY(y);
      // Debounce persistence in real usage — for now update immediately
      await updateCoverAsync({ ...activePage.cover, positionY: y });
    },
    [updateCoverAsync, activePage],
  );

  const handleCoverImageChange = useCallback(
    async (url: string) => {
      if (!activePage) return;
      setCoverPickerOpen(false);
      const next = { ...activePage.cover, coverImage: url } as any;
      delete next.gradient;
      await updateCoverAsync(next);
    },
    [updateCoverAsync, activePage],
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

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: 200,
        background: gradient,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setHovering(false)}
    >
      {hovering &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: btnPosition.top,
              right: btnPosition.right,
              display: "flex",
              gap: 6,
              zIndex: 9999,
            }}
            onMouseEnter={handleMouseEnter}
          >
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <button className="cover-action-btn" onClick={onChangeCover}>
                  <Pencil size={12} /> Change cover
                </button>
              </PopoverTrigger>
              <PopoverPortal container={document.getElementById("#root")}>
                <PopoverContent style={{ zIndex: 9999 }}>
                  <CoverPickerCard
                    coverImage={activePage.cover.coverImage}
                    positionY={(activePage.cover as any).positionY ?? positionY}
                    onCoverImageChange={handleCoverImageChange}
                    onPositionChange={handlePositionChange}
                    onGradientChange={handleGradientChange}
                  />
                </PopoverContent>
              </PopoverPortal>
            </Popover>
            <button
              className="cover-action-btn cover-action-btn--danger"
              onClick={async () => await onRemoveCoverAsync()}
            >
              <Trash2 size={12} /> Remove
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}

// ============================================================
// IconButton
// ============================================================

function IconButton({
  cover,
  hasCover,
  open,
  onOpenChange,
  target,
  onTargetChange,
  onSelect,
  paddingLeft,
  translateX,
  hasThreads,
}: {
  cover: Page["cover"];
  hasCover: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: Target;
  onTargetChange: (t: Target) => void;
  onSelect: (name: string, color?: string) => void;
  paddingLeft: number;
  translateX: number;
  hasThreads?: boolean;
}) {
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
              color: cover.color ?? "var(--tt-theme-text)",
            }}
          >
            {cover.target === "Emoji" && cover.iconName}
            {cover.target === "Icons" && (
              <DynamicIcon
                name={cover.iconName!}
                stroke={cover.color ?? "var(--tt-text-color)"}
                size={80}
                strokeWidth={1.25}
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
              onSelect={onSelect}
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
  activePage: Page;
  sidebarWidth: number;
  collapsed: boolean;
  paddingLeft: number;
  translateX: number;
  hasThreads?: boolean;
}

export function CoverHeader({
  activePage,
  paddingLeft,
  translateX,
  hasThreads,
}: CoverHeaderProps) {
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  const [target, setTarget] = useState<Target>("Emoji");

  const { updateCoverAsync } = useSimpleEditor();

  const hasIcon = !!activePage.cover.iconName;
  const hasCoverImage = !!activePage.cover.coverImage;
  // Gradient stored on cover.gradient (extend your Page type if needed)
  const hasGradient = !!(activePage.cover as any).gradient;
  const hasCover = hasCoverImage || hasGradient;

  useEffect(() => {
    console.log("hasThreads", hasThreads);
  }, [hasThreads]);

  const onSelectIconAsync = useCallback(
    async (name: string, color?: string) => {
      setIconPickerOpen(false);
      await updateCoverAsync({
        ...activePage.cover,
        iconName: name,
        target,
        color,
      });
    },
    [updateCoverAsync, activePage, target],
  );

  const handleRemoveCover = useCallback(async () => {
    const next = { ...activePage.cover, coverImage: null } as any;
    delete next.gradient;
    await updateCoverAsync(next);
  }, [updateCoverAsync, activePage]);

  return (
    <div
      className="cover-header-wrapper"
      style={{ width: "100%", position: "relative", minHeight: 60 }}
    >
      {/* ── Cover display ── */}
      {hasCoverImage && (
        <CoverImage
          coverImage={activePage.cover.coverImage!}
          onRemoveCoverAsync={handleRemoveCover}
        />
      )}

      {hasGradient && !hasCoverImage && (
        <GradientCover
          gradient={(activePage.cover as any).gradient}
          onRemoveCoverAsync={handleRemoveCover}
        />
      )}

      {/* ── Icon button ── */}
      {hasIcon && (
        <IconButton
          cover={activePage.cover}
          hasCover={hasCover}
          open={iconPickerOpen}
          onOpenChange={setIconPickerOpen}
          target={target}
          onTargetChange={setTarget}
          onSelect={onSelectIconAsync}
          paddingLeft={paddingLeft}
          translateX={translateX}
          hasThreads={hasThreads}
        />
      )}
    </div>
  );
}
