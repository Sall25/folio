import { useState, useCallback, useRef, memo } from "react";
import { DynamicIcon } from "./dynamic-icon";
import "./cover-header.scss";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import type { Target } from "./types";
import type { Page } from "src/types";
import { IconPickerCard } from "./icon-picker-card";
import { useActivePageState } from "src/components/tiptap-templates/simple/context/active-page-context";
import { usePage } from "src/hooks/use-pages";
import { CoverImage } from "./cover-image";
import { GradientCover } from "./gradient-cover";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";
import { CoverHeaderSkeleton } from "src/components/tiptap-templates/simple/components/skeletons";
import { usePageCapabilities } from "src/hooks/use-page-role";
import { useIsMobile } from "src/hooks/use-breakpoint";

const IconButton = memo(function IconButton({
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
  const cover = page.cover;
  const hasCover = !!cover.coverImage || !!cover.gradient;
  const isMobile = useIsMobile();

  const { mutateAsync } = usePatchPage(({ id, patch }) => patchPage(id, patch));
  const mutateAsyncRef = useRef(mutateAsync);

  const onSelectIconAsync = useCallback(
    async (name: string, color?: string) => {
      await mutateAsyncRef.current({
        id: page.id,
        patch: {
          cover: {
            ...page.cover,
            iconName: name,
            target,
            color: color ?? null,
          },
        },
      });
    },
    [page, target],
  );

  const onRemoveIconAsync = useCallback(async () => {
    await mutateAsyncRef.current({
      id: page.id,
      patch: {
        cover: { ...page.cover, iconName: null, target: null, color: null },
      },
    });
    onOpenChange(false);
  }, [page, onOpenChange]);

  const iconColor =
    cover.color == null || cover.color === "var(--tt-text-color)"
      ? "var(--tt-theme-text)"
      : cover.color;

  const { canEditContent, isLoading } = usePageCapabilities(page.id);

  return (
    <div
      style={{
        paddingTop: hasCover ? 0 : 24,
        paddingLeft,
        transform:
          hasThreads && !isMobile
            ? `translateX(${translateX}px)`
            : "translateX(0)",
        maxWidth: 400,
      }}
    >
      {canEditContent && !isLoading ? (
        <Popover
          open={open}
          onOpenChange={onOpenChange}
          key={"page-icon-popover"}
        >
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="cover-icon-btn"
              style={{
                fontSize: 60,
                marginTop: hasCover ? -60 : 0,
                color: iconColor,
              }}
            >
              {cover.target === "Emoji" && cover.iconName}
              {cover.target === "Icons" && cover.iconName && (
                <DynamicIcon
                  name={cover.iconName}
                  size={95}
                  weight={500}
                  style={{ color: iconColor }}
                />
              )}
              {cover.target === "Upload" && cover.iconName && (
                <img
                  src={cover.iconName}
                  alt="icon"
                  style={{
                    width: 85,
                    height: 85,
                    objectFit: "contain",
                    borderRadius: 4,
                    display: "block",
                  }}
                />
              )}
            </Button>
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
                onRemove={onRemoveIconAsync}
              />
            </PopoverContent>
          </PopoverPortal>
        </Popover>
      ) : (
        <Button
          key={"page-icon-btn"}
          variant="ghost"
          className="cover-icon-btn"
          style={{
            fontSize: 60,
            marginTop: hasCover ? -60 : 0,
            color: iconColor,
          }}
        >
          {cover.target === "Emoji" && cover.iconName}
          {cover.target === "Icons" && cover.iconName && (
            <DynamicIcon
              name={cover.iconName}
              size={95}
              weight={500}
              style={{ color: iconColor }}
            />
          )}
          {cover.target === "Upload" && cover.iconName && (
            <img
              src={cover.iconName}
              alt="icon"
              style={{
                width: 85,
                height: 85,
                objectFit: "contain",
                borderRadius: 4,
                display: "block",
              }}
            />
          )}
        </Button>
      )}
    </div>
  );
});

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
  marginLeft: number;
}

export function CoverHeader({
  paddingLeft,
  translateX,
  hasThreads,
  providedPage,
  marginLeft,
}: CoverHeaderProps) {
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [target, setTarget] = useState<Target>("Emoji");
  const isMobile = useIsMobile();

  // fetch the active page only when no page is provided (peek passes its own)
  const { activePageId } = useActivePageState();
  const { data: activePage } = usePage(providedPage ? null : activePageId);
  const page = providedPage ?? activePage;

  // Am I rendering inside a panel (peek / center), or in the main editor?
  //
  // This used to be read from usePageView()'s `target` — but that is GLOBAL
  // state, true whenever a panel is open ANYWHERE. So the moment a peek opened
  // beside it, the MAIN editor's cover header also saw "a panel is open", zeroed
  // its margin/padding, and its icon visibly shifted left.
  //
  // The panels are precisely the instances that pass `providedPage`; the main
  // editor reads the active page from context instead. That's the real test, and
  // unlike the view target it's local to this instance.
  const isPanel = !!providedPage || isMobile;

  const { mutateAsync } = usePatchPage(({ id, patch }) => patchPage(id, patch));
  const mutateAsyncRef = useRef(mutateAsync);

  const handleRemoveCover = useCallback(async () => {
    if (!page) return;
    await mutateAsyncRef.current({
      id: page.id,
      patch: { cover: { ...page.cover, coverImage: null, gradient: null } },
    });
  }, [page]);

  // Was `return null`, which is why the title and body jumped down the moment a
  // cover appeared. Reserve the space instead.
  if (!page) {
    return (
      <CoverHeaderSkeleton
        paddingLeft={isPanel ? 0 : paddingLeft}
        marginLeft={isPanel ? 0 : marginLeft}
      />
    );
  }

  const hasIcon = !!page.cover.iconName;
  const hasCoverImage = !!page.cover.coverImage;
  const hasGradient = !!page.cover.gradient;

  console.log("isMobile", isMobile);
  return (
    <div
      className="cover-header-wrapper"
      style={{
        width: "100%",
        position: "relative",
        maxHeight: 280,
        minHeight: 50,
      }}
    >
      <div
        style={{
          width: `calc(100vw)`,
          marginLeft: isMobile ? "0px !important" : marginLeft,
          transition: "margin-left 0.2s ease, width 0.2s ease",
        }}
      >
        {hasCoverImage && (
          <CoverImage page={page} onRemoveCoverAsync={handleRemoveCover} />
        )}
        {hasGradient && !hasCoverImage && (
          <GradientCover
            page={page}
            gradient={page.cover.gradient!}
            onRemoveCoverAsync={handleRemoveCover}
          />
        )}
      </div>
      <div
        style={{
          width: `calc(100vw)`,
          marginLeft: isPanel
            ? 0
            : page.settings.width === "medium"
              ? 280
              : marginLeft,
          transition: "margin-left 0.15s ease, width 0.15s ease",
        }}
      >
        {hasIcon && (
          <IconButton
            open={iconPickerOpen}
            onOpenChange={setIconPickerOpen}
            target={target}
            onTargetChange={setTarget}
            paddingLeft={isPanel ? 0 : paddingLeft}
            translateX={isPanel ? 0 : translateX}
            hasThreads={hasThreads}
            page={page}
          />
        )}
      </div>
    </div>
  );
}
