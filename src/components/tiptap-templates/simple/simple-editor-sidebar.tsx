import {
  Search,
  Home,
  Inbox,
  Store,
  LibraryBig,
  Sparkles,
  Settings,
  LayoutTemplate,
  ChevronsLeft,
  PenBox,
} from "lucide-react";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardBody,
  //CardFooter,
  CardHeader,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";

import "./simple-editor-sidebar.scss";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-location";
import { useEditorLayout } from "./context/editor-layout-context";
import { useSearch } from "./context/search-context";
import { SidebarTree } from "./components/sidebar-tree";
import { usePageTree } from "src/hooks/use-pages";
import { useTeamspaces } from "src/hooks/use-teamspaces";
import { useGroups } from "src/hooks/use-groups";
import { makePage } from "src/utils/make-page";
import { useCreatePage } from "src/hooks/use-create-page";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage as updatePage } from "src/api/pages";
import { useActivePage } from "./context/active-page-context";
import { Section } from "./components/section";
import { ScrollFog } from "src/components/tiptap-ui-primitive/scroll-frog";
import { useWorkspaceSettings as useWorkspaceSettingsModal } from "./context/workspace-settings-context";
import { CreateTeamspaceModal } from "./components/create-teamspace-modal";
import type { Group, Teamspace } from "src/types";
import { useCurrentPerson } from "src/hooks/use-session";
import { useTemplates } from "./context/templates-context";
import { SidebarResizeHandle } from "./components/sidebar-resize-handle";
import { createPortal } from "react-dom";
import { useWhyDidYouRender } from "src/lib/useWhyDidYouRender";

function User() {
  const { t } = useTranslation();
  const { /*collapsed, onCollapsedChange,*/ collapseWithFloat } =
    useEditorLayout();
  const [hovered, setHovered] = useState(false);
  const { person } = useCurrentPerson();

  // const onToggle = useCallback(
  //   () => onCollapsedChange(!collapsed),
  //   [onCollapsedChange, collapsed],
  // );

  const name = person?.name ?? "";
  const initial = name ? name.charAt(0).toUpperCase() : "?";

  const { activePageId, setActivePageId } = useActivePage();
  const createPage = useCreatePage();

  const onCreatePage = () => {
    const newPage = makePage({
      title: t("page.newPage"),
      parentId: null,
      category: "Private",
    });

    createPage
      .mutateAsync(newPage)
      .then((newPage) => setActivePageId(newPage.id))
      .catch(() => {
        if (activePageId) {
          setActivePageId(activePageId);
        }
        console.log("failed to create new page");
      });
  };

  return (
    <ButtonGroup
      className="use-button-group"
      orientation="horizontal"
      style={{
        width: "100%",
        justifyContent: "flex-start",
        cursor: "pointer",
      }}
      onMouseOver={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Button
        style={{
          minWidth: 20,
          width: 20,
          minHeight: 20,
          height: 20,
          borderRadius: "var(--tt-radius-sm)",
        }}
        className="name-initial"
        data-highlighted={true}
      >
        <span className="tiptap-button-icon">{initial}</span>
      </Button>
      <Spacer orientation="horizontal" size={5} />
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
        {t("sidebar.personalSpace", { name })}
      </span>
      <Spacer size={1} orientation="horizontal" />
      <Button
        variant="ghost"
        size="large"
        tooltip={t("sidebar.collapse")}
        onClick={collapseWithFloat}
        style={{
          background: "transparent",
          padding: 0,
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.12s ease",
        }}
      >
        <ChevronsLeft className="tiptap-button-icon" />
      </Button>
      <Spacer orientation="horizontal" />

      <Button
        size="large"
        variant="ghost"
        tooltip={t("page.newPage")}
        onClick={onCreatePage}
      >
        <PenBox
          className="tiptap-button-icon"
          // fill="var(--tt-brand-color-400)"
        />
        {/* <ChevronsLeft className="tiptap-button-icon" /> */}
      </Button>
    </ButtonGroup>
  );
}

function WorkspaceHeader() {
  // const { t } = useTranslation();
  const { collapsed } = useEditorLayout();
  const [, setHide] = useState(true);

  // const onToggle = useCallback(
  //   () => onCollapsedChange(!collapsed),
  //   [onCollapsedChange, collapsed],
  // );
  return (
    <CardItemGroup
      orientation={collapsed ? "vertical" : "horizontal"}
      onMouseLeave={() => setHide(true)}
      onMouseOver={() => setHide(false)}
      style={{
        width: "100%",
        paddingLeft: !collapsed ? 2 : 0,
        border: "none",
      }}
    >
      {/* {!collapsed && <Logo collapsed={collapsed} />} */}
      {!collapsed && <User />}

      {/* <Spacer orientation="horizontal" />

      {collapsed && (
        <Button
          variant="ghost"
          onClick={onToggle}
          tooltip={t("sidebar.expand")}
          style={{ justifyContent: "flex-start" }}
        >
          <PanelRight
            style={{ minWidth: 18, width: 18, minHeight: 18, height: 18 }}
            className="tiptap-button-icon"
          />
        </Button>
      )} */}
    </CardItemGroup>
  );
}

function NavItems() {
  const { t } = useTranslation();
  const { collapsed } = useEditorLayout();
  const navigate = useNavigate();

  const handleHomeClick = () => {
    navigate({ to: "/" });
  };
  const handleLibraryClick = () => {
    navigate({ to: "/library/Recents" });
  };

  const { open, onOpenChange } = useSearch();
  // const {
  //   open: templatesGalleryOpen,
  //   onOpenChange: onTemplatesGalleryOpenChange,
  // } = useTemplates();

  return (
    <CardItemGroup
      orientation="vertical"
      style={{ width: "100%", gap: 0, marginTop: 10 }}
    >
      <ButtonGroup className="sidebar-nav-item" orientation="horizontal">
        <Button
          size="large"
          // variant="ghost"
          data-active-state="on"
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
          {/* <Spacer orientation="horizontal" size={1} /> */}
          {!collapsed && (
            <span className="tiptap-button-text">{t("sidebar.home")}</span>
          )}
        </Button>
        <Spacer orientation="horizontal" size={2.5} />
        <ButtonGroup orientation="horizontal" style={{ maxWidth: "90px" }}>
          <Button
            variant="ghost"
            size="large"
            // data-active-state={libraryOpen ? "on" : "off"}
            onClick={handleLibraryClick}
            style={{ fontWeight: 400, color: "var(--tt-text-color)" }}
            tooltip={t("sidebar.library")}
          >
            <LibraryBig
              size={32}
              strokeWidth={1.8}
              className="tiptap-button-icon"
            />
          </Button>
          <Button
            size="large"
            variant="ghost"
            onClick={handleHomeClick}
            tooltip={t("sidebar.inbox")}
            style={{ fontWeight: 400, color: "var(--tt-text-color)" }}
          >
            <Inbox size={32} strokeWidth={1.8} className="tiptap-button-icon" />
            <Spacer orientation="horizontal" size={1} />
            {/* {!collapsed && <span className="tiptap-button-text">Inbox</span>} */}
          </Button>

          <Button
            size="large"
            variant="ghost"
            style={{ fontWeight: 400, color: "var(--tt-text-color)" }}
            tooltip={t("sidebar.store")}
          >
            <Store size={32} strokeWidth={1.8} className="tiptap-button-icon" />
            <Spacer orientation="horizontal" size={1} />
            {/* {!collapsed && (
            <span className="tiptap-button-text">Marketplace</span>
          )} */}
          </Button>
        </ButtonGroup>

        <Spacer orientation="horizontal" />

        <Button
          size="large"
          variant="ghost"
          onClick={() => onOpenChange?.(true)}
          tooltip={t("sidebar.search")}
          style={{
            fontWeight: 400,
            color: "var(--tt-text-color)",
            minHeight: 32,
            height: 32,
            minWidth: 36,
            width: 36,
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

// ── ShowcaseSection: feature-of-the-week, collapsible, empty for now ──────────
function ShowcaseSection() {
  const { t } = useTranslation();

  return (
    <Section
      label={t("sidebar.showcase")}
      defaultCollapsed={false}
      badge={
        <span className="sidebar-section__badge">
          <Sparkles size={11} />
          {t("sidebar.featureOfTheWeek")}
        </span>
      }
    >
      <div className="sidebar-showcase-empty">
        <Sparkles size={16} className="sidebar-showcase-empty__icon" />
        <div className="sidebar-showcase-empty__text">
          <span className="sidebar-showcase-empty__title">
            {t("showcase.title")}
          </span>
          <span className="sidebar-showcase-empty__desc">
            {t("showcase.desc")}
          </span>
        </div>
      </div>
    </Section>
  );
}

function TemplatesModalTrigger() {
  const { onOpenChange } = useTemplates();
  const { t } = useTranslation();
  return (
    <Button
      size="large"
      variant="ghost"
      onClick={() => onOpenChange?.(true)}
      style={{ width: "100%", justifyContent: "flex-start" }}
    >
      <LayoutTemplate className="tiptap-button-icon" />
      <Spacer size={3} />
      <span className="tiptap-button-text">{t("templates.browse")}</span>
    </Button>
  );
}

function LibraryPaletteTrigger() {
  const navigate = useNavigate();
  const handleLibraryClick = () => {
    navigate({ to: "/library/Recents" });
  };

  return (
    <Button
      size="large"
      onClick={handleLibraryClick}
      variant="ghost"
      style={{ width: "100%", justifyContent: "flex-start" }}
    >
      <LibraryBig className="tiptap-button-icon" />
      <Spacer size={3} />
      <span>Library</span>
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
  } = useEditorLayout();
  const isMobile = mode === "mobile";
  const { tree, isPending, isLoading } = usePageTree();
  // Joined to teamspace-pages by id, only to show a member count in the row.
  const { data: teamspaces = [] } = useTeamspaces();
  const { data: groups = [] } = useGroups();
  const patchPage = usePatchPage(({ id, patch }) => updatePage(id, patch));
  const createPage = useCreatePage();
  const { setActivePageId /*, activePageId*/ } = useActivePage();
  //  const { onOpenChange: onTemplatesGalleryOpenChange } = useTemplates();
  const { openTo } = useWorkspaceSettingsModal();
  const [createTeamspaceOpen, setCreateTeamspaceOpen] = useState(false);

  const isFloating = !isMobile && collapsed && peeking;

  const [peekEntered, setPeekEntered] = useState(false);

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
  const [floatingMounted, setFloatingMounted] = useState(false);

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

  // const showFloating = !isMobile && collapsed && floatingMounted;

  useWhyDidYouRender("FloatingCard", {
    collapsed,
    peeking,
    peekEntered,
    floatingMounted,
    mode,
    sidebarWidth,
    drawerWidth,
  });

  const floatingActive = !isMobile && collapsed && phase !== "hidden";
  // Visible position: on-screen while open OR during the grace period of leaving.
  // Only 'hidden' (after the timer) actually moves it off.
  const onScreen = phase === "open" || phase === "leaving";
  const showContent = isMobile ? true : !collapsed || floatingActive;

  const sidebarCard = (
    <Card
      className={`sidebar ${collapsed ? "sidebar--collapsed" : ""} ${
        isMobile ? "sidebar-mobile" : ""
      } ${floatingActive ? "sidebar--floating" : ""}`}
      onMouseEnter={() => !isMobile && collapsed && openPeek()}
      onMouseLeave={() => !isMobile && closePeek()}
      style={{
        zIndex: isMobile ? 950 : floatingActive ? 900 : 120,
        position: "fixed",
        left: 0, //floatingActive ? 8 : 0,
        top: floatingActive ? "8%" : 0,
        borderRadius: 0,
        borderTopRightRadius: floatingActive ? "var(--tt-radius-xl)" : 0,
        borderBottomRightRadius: floatingActive ? "var(--tt-radius-xl)" : 0,
        boxShadow: floatingActive ? "var(--tt-shadow-md)" : "none",
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

      {showContent && (
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

                <ShowcaseSection />
                <Spacer orientation="vertical" size={15} />
              </>
            )}

            <SidebarTree
              tree={tree}
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
                });
                createPage
                  .mutateAsync(p)
                  .then((page) => setActivePageId(page.id));
              }}
              onRenameSection={() => {}}
              onDeleteSection={() => {}}
              isLoading={isPending || isLoading}
            />

            {!peeking && (
              <>
                <Spacer orientation="vertical" size={12} />
                <Button
                  size="large"
                  variant="ghost"
                  onClick={() => openTo("teamspaces")}
                  aria-label="Open workspace settings"
                  style={{
                    justifyContent: "flex-start",
                    width: "100%",
                    color: "var(--tt-text-color)",
                  }}
                >
                  <Settings className="tiptap-button-icon" size={16} />
                  <Spacer orientation="horizontal" size={3} />
                  <span className="tiptap-button-text">Workspace settings</span>
                </Button>
                <Spacer orientation="vertical" size={1} />
                <TemplatesModalTrigger />
                <Spacer orientation="vertical" size={1} />
                <LibraryPaletteTrigger />
                <Spacer orientation="vertical" size={25} />
              </>
            )}
          </>
        </CardBody>
      )}

      {/* <Separator orientation="horizontal" style={{ height: 0.5 }} /> */}
      {/* {!collapsed && <WorkSpaceFooter onCreatePage={onCreatePage} />} */}

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
