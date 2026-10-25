import { memo, useEffect, useRef, useState, type CSSProperties } from "react";
import { UploadedIcon } from "src/components/uploaded-icon/uploaded-icon";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-location";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { PageItemIcon } from "./page-item-icon";
import { PageItemOptions } from "./page-item-options";
import { TeamspaceBadge } from "./teamspace-badge";
import {
  TbArrowRight,
  TbPin,
  TbPinnedOff,
  TbPlus,
} from "src/components/tiptap-icons/tabler-icons";
import { SB_ICON_SM } from "../../shell/sidebar/sidebar-icon";
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
} from "../context/active-page-context";
import { useCreatePage } from "src/hooks/use-create-page";
import { makeChildPage } from "src/utils/make-page";
import { usePageCapabilities } from "src/hooks/use-page-role";
import { useIsMobile } from "src/hooks/use-breakpoint";
import { useEditorLayoutActions } from "../../shell/context/editor-layout-context";
import { usePinControl } from "../../workspace/context/teamspace-pin-context";
import { getActiveEditor } from "../../editor/context/active-editor-store";
import { setEditorTitle } from "../../editor/utils/doc-title";
import { CloudDownload } from "src/components/icons";
import { useAvailableOffline } from "../available-offline";
import { SbChevronRightIcon } from "src/components/tiptap-icons/sidebar-icons";
import { teamspaceTint } from "src/lib/teamspace-color";
import { useTeamspaceAccentColor } from "src/hooks/use-teamspaces";
import { TeamspaceFaces } from "./teamspace-faces";

function initialOf(title: string): string {
  return Array.from(title.trim())[0]?.toUpperCase() ?? "T";
}

interface PageItemProps {
  page: Page;
  depth?: number;
  disableActive?: boolean;
  /** Optional second line under the title. */
  subtitle?: string;
  /** A top-level row in the sidebar tree (design 48): chevron always shown,
   *  a 24px icon slot, a bold name. A teamspace's icon also gets a tile. */
  topLevel?: boolean;
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
  /**
   * Mark rows of teamspace pages with the teamspace's icon (TeamspaceBadge).
   * The sidebar turns it on for top-level rows only: nested rows sit under
   * a parent that already shows where they live.
   */
  showTeamspaceBadge?: boolean;
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
  topLevel = false,
  expanded = false,
  onToggleExpand,
  canEditContent = false,
  showTeamspaceBadge = false,
}: PageItemProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(page.title);
  // Hover is CSS only (:hover): React state per row lagged behind fast
  // pointer moves and could stay "on" when mouseleave was missed. State is
  // kept only for the options menu, so the buttons stay while it's open.
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { activePageId, setActivePageId } = useActivePage();

  const { mutateAsync } = usePatchPage(({ id, patch }) => patchPage(id, patch));
  const mutateAsyncRef = useRef(mutateAsync);
  const createPage = useCreatePage();

  // Marked "Available offline" itself (a page, or a teamspace on its root
  // row). Pages kept through a teamspace or as favorites aren't marked one
  // by one — that would mark every row.
  const offline = useAvailableOffline(page);
  const markedOffline =
    !!offline &&
    (offline.by === "page" ||
      (offline.isTeamspaceRoot && offline.by === "teamspace"));

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
  const chosenTint = useTeamspaceAccentColor(isTeamspaceRoot ? page.id : null);

  // A page inside a teamspace (not the teamspace itself) gets a badge; the
  // badge hides itself while you're in that teamspace.
  const withBadge =
    showTeamspaceBadge && page.teamspaceId != null && !isTeamspaceRoot;

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
      // Open right now → rename its title block too (otherwise the next
      // keystroke in the title would save the old name back).
      const editor = getActiveEditor();
      if (editor && activePageId === page.id) setEditorTitle(editor, trimmed);
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
  };

  // Touch screens have no hover: keep the enter arrow visible there.
  const touchActions = isMobile && isTeamspaceRoot;

  // Design 48: top-level rows (a teamspace is always one) keep a visible
  // chevron and a 24px icon slot; only a teamspace's icon sits on a tile.
  const lead = topLevel || isTeamspaceRoot;

  return (
    <div className="page-item-tree">
      <Spacer orientation="vertical" size={1.1} />
      <CardItemGroup
        orientation="horizontal"
        className={`page-item ${isActive ? "active" : ""} ${isTeamspaceRoot ? "is-teamspace-root" : ""} ${lead ? "is-top-level" : ""}`}
        style={{ paddingLeft: `${6 + depth * 14}px` }}
        data-menu-open={menuOpen || undefined}
        data-touch-actions={touchActions || undefined}
        onClick={() => onSelect(page.id)}
      >
        {/* Leading slot: the chevron replaces the icon on hover. */}
        <span className="page-item-leading">
          <button
            type="button"
            className="page-item-disclosure"
            data-expanded={expanded}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse" : "Expand"}
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand?.(page.id);
            }}
          >
            <SbChevronRightIcon size={12} strokeWidth={2} />
          </button>

          <span className="page-item-icon">
            {isTeamspaceRoot &&
            page.cover.target === "Upload" &&
            page.cover.iconName ? (
              // An uploaded picture is the tile itself: a circle.
              <UploadedIcon src={page.cover.iconName} size={24} />
            ) : isTeamspaceRoot ? (
              <span
                className="page-item-ts-tile"
                style={
                  {
                    "--ts-tint": teamspaceTint(page, chosenTint),
                  } as CSSProperties
                }
                aria-hidden="true"
              >
                {page.cover.iconName ? (
                  <PageItemIcon
                    cover={page.cover}
                    styles={{ width: 16, height: 16, fontSize: 14 }}
                  />
                ) : (
                  <span className="page-item-ts-initial">
                    {initialOf(title)}
                  </span>
                )}
              </span>
            ) : (
              <PageItemIcon cover={page.cover} variant="sidebar" />
            )}
          </span>
        </span>

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

        {markedOffline && !editing && (
          <CloudDownload
            size={12}
            className="page-item-offline"
            role="img"
            aria-label={t("offline.keep.badge")}
          >
            <title>{t("offline.keep.badge")}</title>
          </CloudDownload>
        )}

        {withBadge && <TeamspaceBadge teamspaceId={page.teamspaceId!} />}
        {isTeamspaceRoot && !editing && (
          <TeamspaceFaces teamspaceId={page.id} />
        )}

        {(canEditContent || pinnable || isTeamspaceRoot) && (
          <CardItemGroup orientation="horizontal" className="page-item-actions">
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
                  <TbPinnedOff {...SB_ICON_SM} className="tiptap-button-icon" />
                ) : (
                  <TbPin {...SB_ICON_SM} className="tiptap-button-icon" />
                )}
              </Button>
            )}
            {canEditContent && (
              <>
                <PageItemOptions
                  onOpenChange={setMenuOpen}
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
                  <TbPlus {...SB_ICON_SM} className="tiptap-button-icon" />
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
                  border: "0.5px solid var(--tt-border-color)",
                  background:
                    "color-mix(in srgb, var(--tt-text-primary) 8%, transparent)",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  enterTeamspace();
                }}
              >
                <TbArrowRight {...SB_ICON_SM} className="tiptap-button-icon" />
              </Button>
            )}
          </CardItemGroup>
        )}
      </CardItemGroup>
    </div>
  );
}
