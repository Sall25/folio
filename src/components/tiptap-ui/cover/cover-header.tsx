// cover-header.tsx
import { useState, useCallback, useEffect } from "react";
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

// ============================================================
// CoverImage
// ============================================================

function CoverImage({
  coverImage,
  onChangeCoverAsync,
  onRemoveCoverAsync,
}: {
  coverImage: string;
  onChangeCoverAsync: () => Promise<void>;
  onRemoveCoverAsync: () => Promise<void>;
}) {
  const [hovering, setHovering] = useState(false);

  return (
    <div
      style={{ position: "relative", width: "100%", height: 200 }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <img
        src={coverImage}
        alt="cover"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
      {hovering && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            right: 24,
            display: "flex",
            gap: 6,
          }}
        >
          <button
            className="cover-action-btn"
            onClick={async () => await onChangeCoverAsync()}
          >
            <Pencil size={12} /> Change cover
          </button>
          <button
            className="cover-action-btn cover-action-btn--danger"
            onClick={async () => await onRemoveCoverAsync()}
          >
            <Trash2 size={12} /> Remove
          </button>
        </div>
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
        // paddingLeft: editorLeft,
        paddingTop: hasCover ? 0 : 24,
        paddingLeft,
        transform: hasThreads ? `translateX(${translateX}px)` : `translateX(0)`,
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
  updateCoverAsync: (cover: Page["cover"]) => Promise<void>;
  sidebarWidth: number;
  collapsed: boolean;
  paddingLeft: number;
  translateX: number;
  hasThreads?: boolean;
}

export function CoverHeader({
  activePage,
  updateCoverAsync,
  paddingLeft,
  translateX,
  hasThreads,
}: CoverHeaderProps) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Target>("Emoji");

  const hasIcon = !!activePage.cover.iconName;
  const hasCover = !!activePage.cover.coverImage;

  useEffect(() => {
    console.log("hasThreads", hasThreads);
    console.log("cover header mounted");
  }, [hasThreads]);

  const onSelectAsync = useCallback(
    async (name: string, color?: string) => {
      setOpen(false);
      await updateCoverAsync({
        ...activePage.cover,
        iconName: name,
        target,
        color,
      });
    },
    [updateCoverAsync, activePage, target],
  );

  return (
    <div style={{ width: "100%", position: "relative", minHeight: 80 }}>
      {hasCover && (
        <CoverImage
          coverImage={activePage.cover.coverImage!}
          onChangeCoverAsync={async () =>
            await updateCoverAsync({ ...activePage.cover, coverImage: null })
          }
          onRemoveCoverAsync={async () =>
            await updateCoverAsync({ ...activePage.cover, coverImage: null })
          }
        />
      )}

      {hasIcon && (
        <IconButton
          cover={activePage.cover}
          hasCover={hasCover}
          open={open}
          onOpenChange={setOpen}
          target={target}
          onTargetChange={setTarget}
          onSelect={onSelectAsync}
          paddingLeft={paddingLeft}
          translateX={translateX}
          hasThreads={hasThreads}
        />
      )}
    </div>
  );
}
