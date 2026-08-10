import {
  Search,
  Home,
  Inbox,
  Store,
  LibraryBig,
  ChevronsLeft,
  PenBox,
  ChevronsRight,
  Shapes,
  Archive,
} from "lucide-react";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";

import "./simple-editor-sidebar.scss";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-location";
import { useEditorLayout } from "./context/editor-layout-context";
import { useSearch } from "./context/search-context";
import { SidebarTree } from "./components/sidebar-tree";
import { usePageTree, useRecentPages } from "src/hooks/use-pages";
import { useTeamspaces } from "src/hooks/use-teamspaces";
import { useGroups } from "src/hooks/use-groups";
import { makePage } from "src/utils/make-page";
import { useCreatePage } from "src/hooks/use-create-page";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage as updatePage } from "src/api/pages";
import { useActivePage } from "./context/active-page-context";
import { ScrollFog } from "src/components/tiptap-ui-primitive/scroll-frog";
import { CreateTeamspaceModal } from "./components/create-teamspace-modal";
import type { Group, Teamspace } from "src/types";
import { useCurrentPerson } from "src/hooks/use-session";
import { useTemplates } from "./context/templates-context";
import { SidebarResizeHandle } from "./components/sidebar-resize-handle";
import { createPortal } from "react-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";

import { WorkspaceSwitcherPopover } from "./workspace-switcher-popover";
import { useCurrentWorkspace } from "src/hooks/use-workspaces";
import { useNotifications } from "src/components/tiptap-ui/notification";
import { InboxPanel } from "./components/inbox-panel";
import { TrashPanel } from "./components/trash-panel";
import { Bone } from "./components/skeletons";
import {
  Board,
  BoardContent,
} from "src/components/tiptap-ui-primitive/board/board";
import { CustomizeSidebarPanel } from "./components/customize-sidebar-panel";
import { useHiddenSections } from "./hooks/use-hidden-sections";
import { useSectionOrder } from "./hooks/use-sidebar-order";

function UserSkeleton() {
  return (
    <div className="sidebar-tree-skeleton__row">
      <Bone width={13} height={13} rounded />
      <Bone width={"62%"} height={10} pill />
    </div>
  );
}

function User({ hovered }: { hovered: boolean }) {
  const { person, isLoading } = useCurrentPerson();
  const { workspace } = useCurrentWorkspace();

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const initialRef = useRef<HTMLButtonElement>(null);

  // Workspace identity for the header (falls back to person name until the
  // workspace row loads).
  const wsName = workspace?.name ?? person?.name ?? "";
  const wsIcon = workspace?.icon ?? null;
  const initial = wsName ? wsName.charAt(0).toUpperCase() : "?";

  const { unreadCount } = useNotifications();

  if (isLoading) return <UserSkeleton />;

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            ref={initialRef} // ← add
            style={{
              minWidth: 20,
              width: 20,
              minHeight: 20,
              height: 20,
              cursor: "pointer",
              borderRadius: "var(--tt-radius-sm)",
            }}
            className="name-initial"
            data-highlighted={true}
            onClick={() => setSwitcherOpen((v) => !v)} // ← add
          >
            <span className="tiptap-button-icon workspace-icon-button">
              {wsIcon ? wsIcon : initial} {/* ← icon if set, else initial */}
              {unreadCount > 0 && (
                <span className="workspace-notification-badge">
                  {/* {unreadCount > 99 ? "99+" : unreadCount} */}
                </span>
              )}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <WorkspaceSwitcherPopover
            anchorRef={initialRef}
            open={switcherOpen}
            onClose={() => setSwitcherOpen(false)}
          />
        </PopoverContent>
      </Popover>
      <Spacer orientation="horizontal" size={2} />
      <span
        style={{
          color: "var(--tt-text-primary)",
          fontSize: 14,
          fontWeight: 600,
          fontFamily:
            'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Display", "Segoe UI", Helvetica, Arial, sans-serif',
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: hovered ? 150 : "fit-content",
          transition: "max-width 0.15s ease",
        }}
      >
        {wsName}
      </span>
    </>
  );
}

function NewPageCard() {
  const createPage = useCreatePage();
  const { setActivePageId, activePageId } = useActivePage();
  const { person } = useCurrentPerson();
  const { t } = useTranslation();
  const onCreatePage = () => {
    if (!person) return;
    const newPage = makePage({
      title: t("page.newPage"),
      parentId: null,
      category: "Private",
      ownerId: person.id,
    });
    createPage
      .mutateAsync(newPage)
      .then((created) => setActivePageId(created.id))
      .catch(() => {
        if (activePageId) setActivePageId(activePageId);
        console.log("failed to create new page");
      });
  };
  return (
    <Board
      onClick={onCreatePage}
      style={{
        minHeight: 30,
        height: 40,
        boxShadow: "var(--tt-shadow-elevated-md)",
        borderRadius: "300px !important",
        background: "var(--tt-brand-color-500)",
        cursor: "pointer",
      }}
    >
      <BoardContent
        style={{
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          cursor: "pointer",
        }}
      >
        <Button
          variant="ghost"
          size="large"
          style={{
            background: "transparent",
            color: "white",
            cursor: "pointer",
          }}
        >
          <PenBox className="tiptap-button-icon" style={{ color: "white" }} />
          <Spacer orientation="horizontal" size={5} />
          <span
            className="tiptap-button-text"
            style={{ opacity: 1, display: "block" }}
          >
            {t("page.newPage")}
          </span>
        </Button>
      </BoardContent>
    </Board>
  );
}

function WorkspaceFooter() {
  return (
    <CardFooter style={{ paddingBottom: 10, width: "90%" }}>
      <Spacer orientation="horizontal" size={5} />
      <NewPageCard />
      <Spacer orientation="horizontal" size={5} />
    </CardFooter>
  );
}

function WorkspaceHeader() {
  const { t } = useTranslation();
  const { collapseWithFloat, collapsed, onCollapsedChange, sidebarHovered } =
    useEditorLayout();

  return (
    <CardItemGroup
      orientation={collapsed ? "vertical" : "horizontal"}
      style={{
        width: "100%",
        paddingLeft: !collapsed ? 2 : 0,
        border: "none",
      }}
    >
      <ButtonGroup
        className="use-button-group"
        orientation="horizontal"
        style={{
          width: "100%",
          justifyContent: "flex-start",
          cursor: "pointer",
        }}
      >
        <User hovered={sidebarHovered} />
        <Spacer orientation="horizontal" />
        {!collapsed ? (
          <Button
            variant="ghost"
            size="large"
            tooltip={t("sidebar.collapse")}
            onClick={collapseWithFloat}
            style={{
              background: "transparent",
              padding: 0,
              opacity: sidebarHovered ? 1 : 0,
              transition: "opacity 0.12s ease",
            }}
          >
            <ChevronsLeft
              className="tiptap-button-icon"
              strokeWidth={1}
              style={{ width: 28, height: 22 }}
            />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="large"
            tooltip={t("sidebar.expand")}
            onClick={() => onCollapsedChange(!collapsed)}
            style={{
              background: "transparent",
              padding: 0,
              opacity: sidebarHovered ? 1 : 0,
              transition: "opacity 0.12s ease",
            }}
          >
            <ChevronsRight
              strokeWidth={1}
              style={{ width: 28, height: 22 }}
              className="tiptap-button-icon"
            />
          </Button>
        )}
      </ButtonGroup>
    </CardItemGroup>
  );
}

function NavItems() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { sidebarView, setSidebarView } = useEditorLayout();
  const { unreadCount } = useNotifications();

  const handleHomeClick = () => {
    if (sidebarView === "inbox" || sidebarView === "trash") {
      // Coming back from inbox — just show the tree, don't navigate.
      setSidebarView("pages");
    } else {
      navigate({ to: "/" });
    }
  };
  const handleInboxClick = () => {
    if (sidebarView === "inbox") return;
    setSidebarView("inbox");
  };
  const handleTrashClick = () => {
    if (sidebarView === "trash") return;
    setSidebarView("trash");
  };

  // const handleLibraryClick = () => {
  //   navigate({ to: "/library/Recents" });
  // };

  const { open, onOpenChange } = useSearch();

  return (
    <CardItemGroup
      orientation="vertical"
      style={{ width: "100%", gap: 0, marginTop: 10 }}
    >
      <ButtonGroup className="sidebar-nav-item" orientation="horizontal">
        <Button
          size="large"
          variant="ghost"
          data-highlighted={sidebarView === "pages" ? "true" : "false"}
          // data-active-state={sidebarView === "pages" ? "on" : "off"}
          onClick={handleHomeClick}
          style={{
            fontWeight: 600,
            color: "var(--tt-text-primary)",
            minHeight: 32,
            height: 32,
            minWidth: "fit-content",
            width: "fit-content",

            borderRadius: "var(--tt-radius-xl)",
          }}
        >
          <Home size={32} strokeWidth={3} className="tiptap-button-icon" />
          {sidebarView === "pages" && (
            <>
              <Spacer orientation="horizontal" size={2} />
              <span
                className="tiptap-button-text"
                style={{ opacity: 1, display: "block" }}
              >
                {t("sidebar.home")}
              </span>
            </>
          )}
        </Button>
        <Spacer orientation="horizontal" size={2} />
        <Button
          variant="ghost"
          size="large"
          data-highlighted={sidebarView === "trash" ? "true" : "false"}
          onClick={handleTrashClick}
          style={{
            fontWeight: 400,
            color: "var(--tt-text-primary)",
            minHeight: 32,
            height: 32,
            minWidth: "fit-content",
            width: "fit-content",
            borderRadius: "var(--tt-radius-xl)",
          }}
          tooltip={t("sidebar.trash")}
        >
          <Archive size={32} strokeWidth={1.8} className="tiptap-button-icon" />
          {sidebarView === "trash" && (
            <>
              <Spacer orientation="horizontal" size={2} />
              <span
                className="tiptap-button-text"
                style={{ opacity: 1, display: "block" }}
              >
                {t("sidebar.trash")}
              </span>
            </>
          )}
        </Button>
        <Button
          size="large"
          variant="ghost"
          style={{
            fontWeight: 400,
            color: "var(--tt-text-color)",
            padding: 5,
            minHeight: "fit-content",
            height: "fit-content",
            minWidth: "fit-content",
            width: "fit-content",
          }}
          tooltip={t("sidebar.store")}
        >
          <Store size={32} strokeWidth={1.8} className="tiptap-button-icon" />
        </Button>

        <Button
          size="large"
          variant="ghost"
          data-highlighted={sidebarView === "inbox" ? "true" : "false"}
          onClick={handleInboxClick}
          tooltip={t("sidebar.inbox")}
          style={{
            fontWeight: 400,
            color: "var(--tt-text-color)",
            // padding: 5,
            minHeight: sidebarView === "inbox" ? 32 : "fit-content",
            height: sidebarView === "inbox" ? 32 : "fit-content",
            minWidth: "fit-content",
            width: "fit-content",
            borderRadius: "var(--tt-radius-xl)",
            position: "relative",
          }}
        >
          <Inbox size={32} strokeWidth={1.8} className="tiptap-button-icon" />
          {unreadCount > 0 && (
            <span className="sidebar-inbox-badge">{unreadCount}</span>
          )}
          {sidebarView === "inbox" && (
            <>
              <Spacer orientation="horizontal" size={2} />
              <span
                className="tiptap-button-text"
                style={{ opacity: 1, display: "block" }}
              >
                {t("sidebar.inbox")}
              </span>
            </>
          )}
        </Button>

        <Spacer orientation="horizontal" />

        <Button
          size="large"
          variant="ghost"
          onClick={() => onOpenChange?.(true)}
          tooltip={t("sidebar.search")}
          style={{
            fontWeight: 400,
            color: "var(--tt-text-color)",
            padding: 5,
            minHeight: "fit-content",
            height: "fit-content",
            minWidth: "fit-content",
            width: "fit-content",
          }}
          data-active-state={open ? "on" : "off"}
        >
          <Search strokeWidth={3} size={32} className="tiptap-button-icon" />
          {/* {!collapsed && <span className="tiptap-button-text">Search</span>} */}
        </Button>
      </ButtonGroup>
    </CardItemGroup>
  );
}

function LibraryPaletteTrigger() {
  const navigate = useNavigate();
  const handleLibraryClick = () => {
    navigate({ to: "/library/Recents" });
  };

  return (
    <Button
      onClick={handleLibraryClick}
      size="large"
      variant="ghost"
      style={{ width: "100%", justifyContent: "flex-start" }}
    >
      <LibraryBig className="tiptap-button-icon" />
      <Spacer orientation="horizontal" size={2} />

      <span
        className="tiptap-button-text"
        style={{ opacity: 1, display: "block" }}
      >
        Library
      </span>
    </Button>
  );
}

function TemplatePaletteTrigger() {
  const { onOpenChange, open } = useTemplates();

  return (
    <Button
      variant="ghost"
      size="large"
      style={{ width: "100%", justifyContent: "flex-start" }}
      onClick={() => onOpenChange?.(!open)}
    >
      <Shapes className="tiptap-button-icon" />
      <Spacer orientation="horizontal" size={2} />
      <span
        className="tiptap-button-text"
        style={{ opacity: 1, display: "block" }}
      >
        Templates
      </span>
    </Button>
  );
}

// type PeekPhase = "hidden" | "entering" | "open" | "leaving";

// ── main component: lens + tree + mutation hooks ─────────────────────────────
export function SimpleEditorSidebar() {
  const { t } = useTranslation();
  const {
    collapsed,
    drawerWidth,
    mode,
    sidebarWidth,
    peeking,
    openPeek,
    closePeek,
    peekPhase: phase,
    sidebarView,
    setSidebarHovered,
    customizeSidebarOpen,
    setCustomizeSidebarOpen,
  } = useEditorLayout();
  const isMobile = mode === "mobile";
  const { tree, isPending, isLoading } = usePageTree();
  // Joined to teamspace-pages by id, only to show a member count in the row.
  const { data: teamspaces = [] } = useTeamspaces();
  const { data: groups = [] } = useGroups();
  const patchPage = usePatchPage(({ id, patch }) => updatePage(id, patch));
  const createPage = useCreatePage();
  const { setActivePageId /*, activePageId*/ } = useActivePage();
  const [createTeamspaceOpen, setCreateTeamspaceOpen] = useState(false);
  const { person } = useCurrentPerson();

  const isFloating = !isMobile && collapsed && peeking;

  const [, setPeekEntered] = useState(false);

  useEffect(() => {
    if (isFloating) {
      // Next frame: flip from the pre-enter offset to resting, so the transition
      // has a start position to animate from.
      const raf = requestAnimationFrame(() => setPeekEntered(true));
      return () => cancelAnimationFrame(raf);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPeekEntered(false);
  }, [isFloating]);

  // Render floating styles while entering OR exiting — not just while peeking.
  const [, setFloatingMounted] = useState(false);

  useEffect(() => {
    if (isFloating) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFloatingMounted(true);
      const raf = requestAnimationFrame(() => setPeekEntered(true));
      return () => cancelAnimationFrame(raf);
    }
    setPeekEntered(false); // animate out
    // Unmount the floating styles only AFTER the transition finishes.
    const t = window.setTimeout(() => setFloatingMounted(false), 260); // > transition
    return () => window.clearTimeout(t);
  }, [isFloating]);

  const floatingActive = !isMobile && collapsed && phase !== "hidden";
  // Visible position: on-screen while open OR during the grace period of leaving.
  // Only 'hidden' (after the timer) actually moves it off.
  const onScreen = phase === "open" || phase === "leaving";
  const showContent = isMobile ? true : !collapsed || floatingActive;

  const { data: recentPages } = useRecentPages(6);

  const treeWithRecent = useMemo(
    () => ({
      ...tree,
      Recent: (recentPages ?? []).map((page) => ({
        page,
        children: [],
      })),
    }),
    [tree, recentPages],
  );

  const [order] = useSectionOrder();
  const [hidden, toggleHidden] = useHiddenSections();

  const sidebarCard = (
    <Card
      className={`sidebar ${collapsed ? "sidebar--collapsed" : ""} ${
        isMobile ? "sidebar-mobile" : ""
      } ${floatingActive ? "sidebar--floating" : ""}`}
      onMouseEnter={() => {
        if (!isMobile && collapsed) openPeek();
        setSidebarHovered(true);
      }}
      onMouseLeave={() => {
        if (!isMobile) closePeek();
        setSidebarHovered(false);
      }}
      style={{
        zIndex: isMobile ? 950 : floatingActive ? 900 : 120,
        position: "fixed",
        left: 0,
        top: floatingActive ? "12%" : 0,
        borderRadius: 0,
        borderTopRightRadius: floatingActive ? "var(--tt-radius-xl)" : 0,
        borderBottomRightRadius: floatingActive ? "var(--tt-radius-xl)" : 0,
        width: isMobile
          ? drawerWidth
          : floatingActive
            ? drawerWidth
            : sidebarWidth,
        height: floatingActive ? "min(600px, calc(100vh - 32px))" : "100vh",
        transform:
          isMobile && collapsed
            ? "translateX(-100%)"
            : floatingActive
              ? onScreen
                ? "translateX(0)"
                : "translateX(-110%)"
              : collapsed
                ? "translateX(-110%)"
                : "translateX(0)",
        transition:
          phase === "leaving" || phase === "hidden"
            ? "transform 0.3s cubic-bezier(0.4, 0, 1, 1)" // smooth accelerate-out
            : "transform 0.24s cubic-bezier(0.32, 0.72, 0, 1)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {showContent && !peeking && (
        <CardHeader
          className="sidebar-header-content"
          style={{ border: "none" }}
        >
          <CardItemGroup orientation="vertical" style={{ width: "100%" }}>
            <WorkspaceHeader />
            <Spacer orientation="vertical" size={4} />
            <NavItems />
          </CardItemGroup>
        </CardHeader>
      )}

      {!isMobile && collapsed && floatingActive && (
        <div
          onMouseEnter={openPeek}
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            // Wide enough to cover the card's left edge (left:8 + shadow) AND the
            // diagonal path down from the toolbar hamburger. Full height so the
            // vertically-centered card is always reachable without crossing a gap.
            width: Math.max(28, 8 + 20),
            height: "100vh",
            zIndex: 899,
          }}
        />
      )}

      {showContent && !customizeSidebarOpen && (
        <CardBody
          className="sidebar-body-content"
          style={{
            width: "100%",
            paddingTop: 0,
            paddingBottom: 0,
            paddingLeft: 10,
            paddingRight: 5,
          }}
        >
          <>
            {!peeking && (
              <>
                <ScrollFog edge="top" color="var(--sidebar-fog-color)" />
                <Spacer orientation="vertical" size={15} />
              </>
            )}

            <div style={{ display: "contents" }}>
              {sidebarView === "inbox" ? (
                <InboxPanel key={"inbox-panel"} />
              ) : sidebarView === "trash" ? (
                <TrashPanel key={"trash-panel"} />
              ) : (
                <SidebarTree
                  key={"sidebar-tree"}
                  tree={treeWithRecent}
                  // tree={tree}
                  teamspaces={teamspaces as Teamspace[]}
                  groups={groups as Group[]}
                  onMovePage={({ pageId, newParentId, category }) => {
                    // optimistic move — patch parentId (+ category on cross-section drop)
                    patchPage.mutate({
                      id: pageId,
                      patch: {
                        parentId: newParentId,
                        ...(category ? { category } : {}),
                      },
                    });
                  }}
                  onAddPageToSection={(category) => {
                    if (!person) return null;
                    // A teamspace is created through its own modal (it must create
                    // a page + a Teamspace record sharing one id), not as a plain
                    // page. Every other section creates a page directly.
                    if (category === "Teamspaces") {
                      setCreateTeamspaceOpen(true);
                      return;
                    }
                    const p = makePage({
                      title: t("page.newPage"),
                      parentId: null,
                      category,
                      ownerId: person.id,
                    });
                    createPage
                      .mutateAsync(p)
                      .then((page) => setActivePageId(page.id));
                  }}
                  onRenameSection={() => {}}
                  onDeleteSection={() => {}}
                  isLoading={isPending || isLoading}
                />
              )}
            </div>

            {!peeking && (
              <>
                <Spacer orientation="vertical" size={10} />
                <LibraryPaletteTrigger />
                <Spacer orientation="vertical" size={5} />
                <TemplatePaletteTrigger />
                <Spacer orientation="vertical" size={25} />
              </>
            )}
          </>
        </CardBody>
      )}

      {customizeSidebarOpen && (
        <CustomizeSidebarPanel
          order={order}
          hidden={hidden}
          onToggle={toggleHidden}
          onDone={() => setCustomizeSidebarOpen?.(false)}
        />
      )}

      <WorkspaceFooter />

      {createTeamspaceOpen && (
        <CreateTeamspaceModal
          onClose={() => setCreateTeamspaceOpen(false)}
          onCreated={(pageId) => setActivePageId(pageId)}
        />
      )}
      <SidebarResizeHandle />
    </Card>
  );

  return mode === "mobile"
    ? createPortal(<>{sidebarCard}</>, document.body)
    : sidebarCard;
}
