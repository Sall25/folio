import { memo, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-location";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { PageItemIcon } from "./page-item-icon";
import { PageItemOptions } from "./page-item-options";
import { ArrowRight, Pin, PinOff, Plus } from "lucide-react";
import type { ID, Page } from "src/types";

import "./page-item.scss";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { TextareaAutosize } from "src/components/tiptap-ui-primitive/textarea-auto-size";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";
import {
  useActivePage,
  useActivePageState,
} from "./context/active-page-context";
import { useCreatePage } from "src/hooks/use-create-page";
import { makeChildPage } from "src/utils/make-page";
import { Chevron } from "src/components/tiptap-ui-primitive/chevron";
import { usePageCapabilities } from "src/hooks/use-page-role";
import { useIsMobile } from "src/hooks/use-breakpoint";
import { useEditorLayoutActions } from "./context/editor-layout-context";
import { usePinControl } from "./context/teamspace-pin-context";

interface PageItemProps {
  page: Page;
  depth?: number;
  disableActive?: boolean;
  /** Optional second line under the title (e.g. a teamspace member count). */
  subtitle?: string;
  /** Every row is collapsible now — this just drives the caret's rotation. */
  expanded?: boolean;
  onToggleExpand?: (id: ID) => void;
  /** Flat contexts (e.g. Recents) have no hierarchy — hide the chevron there. */
  showChevron?: boolean;
  /**
   * Whether the current user can edit content, gating the row's hover actions.
   * Computed once in SidebarTree and passed down. Defaults to false so a
   * PageItem rendered outside the sidebar tree simply hides those actions.
   */
  canEditContent?: boolean;
}

export const PageItem = memo(function PageItem(props: PageItemProps) {
  return props.canEditContent === undefined ? (
    <PageItemStandalone {...props} />
  ) : (
    <PageItemView {...props} canEditContent={props.canEditContent} />
  );
});

function PageItemStandalone(props: PageItemProps) {
  const { activePageId } = useActivePageState();
  const { canEditContent } = usePageCapabilities(activePageId);
  return <PageItemView {...props} canEditContent={canEditContent} />;
}

function PageItemView({
  page,
  depth = 0,
  disableActive = false,
  subtitle,
  expanded = false,
  onToggleExpand,
  canEditContent = false,
}: PageItemProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(page.title);
  const [shouldShow, setShouldShow] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { activePageId, setActivePageId } = useActivePage();

  const { mutateAsync } = usePatchPage(({ id, patch }) => patchPage(id, patch));
  const mutateAsyncRef = useRef(mutateAsync);
  const createPage = useCreatePage();

  const pin = usePinControl();
  const pinnable =
    pin != null &&
    page.teamspaceId === pin.teamspaceId &&
    page.id !== pin.teamspaceId &&
    page.category !== "Template";
  const pinned = pinnable && pin.isPinned(page.id);

  // A teamspace's root page carries its own id as teamspace_id — that's how
  // this row knows it IS a teamspace, and offers to enter it.
  const isTeamspaceRoot = page.teamspaceId === page.id;

  const isActive = activePageId === page.id && !disableActive;
  const title = page.title || "New Page";

  const isMobile = useIsMobile();
  const { onCollapsedChange } = useEditorLayoutActions();

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setDraft(page.title));
    return () => cancelAnimationFrame(raf);
  }, [page.title]);

  const commit = async () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== page.title) {
      await mutateAsyncRef.current({ id: page.id, patch: { title: trimmed } });
    } else {
      setDraft(page.title);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") {
      setDraft(page.title);
      setEditing(false);
    }
  };

  const onSelect = (pageId: ID) => {
    setActivePageId(pageId);
    onCollapsedChange(isMobile);
  };

  const enterTeamspace = () => {
    navigate({ to: `/t/${page.id}` });
    if (isMobile) onCollapsedChange(true);
  };

  const smallButtonStyle = {
    minWidth: 20,
    width: 20,
    minHeight: 20,
    height: 20,
    opacity: shouldShow ? 1 : 0,
  };

  // Touch screens have no hover: keep the enter arrow visible there.
  const showActions = shouldShow || (isMobile && isTeamspaceRoot);

  return (
    <div className="page-item-tree">
      <Spacer orientation="vertical" size={1.1} />
      <CardItemGroup
        orientation="horizontal"
        className={`page-item ${isActive ? "active" : ""}`}
        style={{ paddingLeft: `${6 + depth * 14}px` }}
        onClick={() => onSelect(page.id)}
        onMouseOver={() => setShouldShow(true)}
        onMouseLeave={() => setShouldShow(false)}
      >
        {shouldShow ? (
          <Chevron
            expanded={expanded}
            size="small"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand?.(page.id);
            }}
          />
        ) : (
          <PageItemIcon cover={page.cover} />
        )}

        <Spacer orientation="horizontal" size={1} />

        {editing ? (
          <TextareaAutosize
            ref={inputRef}
            cols={40}
            maxRows={1}
            className="page-title-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : subtitle ? (
          <span
            className="page-item-text"
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minWidth: 0,
            }}
          >
            <span className="page-item-title" style={{ flex: "0 0 auto" }}>
              {title}
            </span>
            <span
              className="page-item-subtitle"
              style={{
                fontSize: 11,
                lineHeight: 1.2,
                color:
                  "color-mix(in srgb, var(--tt-text-primary) 50%, transparent)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {subtitle}
            </span>
          </span>
        ) : (
          <span className="page-item-title">{title}</span>
        )}

        {(canEditContent || pinnable || isTeamspaceRoot) && (
          <CardItemGroup
            orientation="horizontal"
            className="page-item-actions"
            style={{ maxWidth: showActions ? "fit-content" : 0 }}
          >
            {pinnable && (
              <Button
                style={smallButtonStyle}
                variant="ghost"
                tooltip={
                  pinned
                    ? t("sidebar.unpin", "Unpin")
                    : t("sidebar.pin", "Pin to teamspace")
                }
                onClick={(e) => {
                  e.stopPropagation();
                  pin.setPinned(page.id, !pinned);
                }}
              >
                {pinned ? (
                  <PinOff size={12} className="tiptap-button-icon" />
                ) : (
                  <Pin size={12} className="tiptap-button-icon" />
                )}
              </Button>
            )}
            {canEditContent && (
              <>
                <PageItemOptions
                  shouldShow={shouldShow}
                  onOpenChange={(v) => setShouldShow(v)}
                  page={page}
                  onRenameAsync={async () => setEditing(true)}
                />
                <Button
                  style={smallButtonStyle}
                  variant="ghost"
                  tooltip="New page"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const child = makeChildPage(page, "New Page");
                    createPage.mutate(child);
                    setActivePageId(child.id);
                  }}
                >
                  <Plus size={12} className="tiptap-button-icon" />
                </Button>
              </>
            )}
            {isTeamspaceRoot && (
              <Button
                variant="ghost"
                tooltip={t("sidebar.enterTeamspace", "Enter teamspace")}
                aria-label={t("sidebar.enterTeamspace", "Enter teamspace")}
                style={{
                  ...smallButtonStyle,
                  opacity: showActions ? 1 : 0,
                  border: "0.5px solid var(--tt-border-color)",
                  background:
                    "color-mix(in srgb, var(--tt-text-primary) 8%, transparent)",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  enterTeamspace();
                }}
              >
                <ArrowRight size={12} className="tiptap-button-icon" />
              </Button>
            )}
          </CardItemGroup>
        )}
      </CardItemGroup>
    </div>
  );
}
