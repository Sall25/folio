// cover-header.tsx
import { useState, useCallback } from "react";
import { Pencil, Trash2, Check } from "lucide-react";
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
import type { SaveState } from "src/components/tiptap-templates/simple/simple-editor-content";
import { Badge } from "src/components/tiptap-ui-primitive/badge";
import { IconPickerCard } from "./icon-picker-card";
// ============================================================
// Save badge
// ============================================================
const SAVE_BADGE: Record<SaveState, { badge: React.ReactNode }> = {
  saved: {
    badge: (
      <Badge data-style="green">
        <Check className="tiptap-badge-icon" />
        <span>Saved</span>
      </Badge>
    ),
  },
  saving: {
    badge: (
      <Badge data-style="ghost">
        <Check className="tiptap-badge-icon" />
        <span>Saving...</span>
      </Badge>
    ),
  },
  unsaved: {
    badge: (
      <Badge data-style="gray">
        <span>Unsaved</span>
      </Badge>
    ),
  },
};

// ============================================================
// SaveBadge
// ============================================================

function SaveBadge({ saveState }: { saveState: SaveState }) {
  const badge = SAVE_BADGE[saveState];
  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        right: 24,
        zIndex: 50,
        pointerEvents: "none",
        opacity: saveState === "saved" ? 0.5 : 1,
        transition: "opacity 0.3s ease",
      }}
    >
      {badge.badge}
    </div>
  );
}

// ============================================================
// CoverImage
// ============================================================

function CoverImage({
  coverImage,
  onChangeCover,
  onRemoveCover,
}: {
  coverImage: string;
  onChangeCover: () => void;
  onRemoveCover: () => void;
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
          <button className="cover-action-btn" onClick={onChangeCover}>
            <Pencil size={12} /> Change cover
          </button>
          <button
            className="cover-action-btn cover-action-btn--danger"
            onClick={onRemoveCover}
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
  editorLeft,
}: {
  cover: Page["cover"];
  hasCover: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: Target;
  onTargetChange: (t: Target) => void;
  onSelect: (name: string, color?: string) => void;
  editorLeft: number;
}) {
  return (
    <div
      style={{
        paddingLeft: editorLeft + 30,
        paddingTop: hasCover ? 0 : 24,
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
  updateCover: (cover: Page["cover"]) => void;
  saveState: SaveState;
  sidebarWidth: number;
  collapsed: boolean;
  editorLeft: number;
}

export function CoverHeader({
  activePage,
  updateCover,
  saveState,
  editorLeft,
}: CoverHeaderProps) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Target>("Emoji");

  const hasIcon = !!activePage.cover.iconName;
  const hasCover = !!activePage.cover.coverImage;

  const onSelect = useCallback(
    (name: string, color?: string) => {
      setOpen(false);
      updateCover({ ...activePage.cover, iconName: name, target, color });
    },
    [updateCover, activePage, target],
  );

  return (
    <div style={{ width: "100%", position: "relative", minHeight: 80 }}>
      <SaveBadge saveState={saveState} />

      {hasCover && (
        <CoverImage
          coverImage={activePage.cover.coverImage!}
          onChangeCover={() =>
            updateCover({ ...activePage.cover, coverImage: null })
          }
          onRemoveCover={() =>
            updateCover({ ...activePage.cover, coverImage: null })
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
          onSelect={onSelect}
          editorLeft={editorLeft}
        />
      )}
    </div>
  );
}
