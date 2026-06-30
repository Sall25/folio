import {
  Search,
  Home,
  Inbox,
  Store,
  LibraryBig,
  Sparkles,
  PanelLeft,
  PanelRight,
  SquarePen,
  ArrowDown,
  ArrowUp,
  LayoutTemplate,
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
import { useCallback, useState } from "react";
import { useNavigate } from "@tanstack/react-location";
import { useEditorLayout } from "./context/editor-layout-context";
import { useSearch } from "./context/search-context";
import { PageItem } from "./page-item";
import { SidebarTree } from "./components/sidebar-tree";
import { usePageTree, useRecentPages } from "src/hooks/use-pages";
import { useTeamspaces } from "src/hooks/use-teamspaces";
import { makePage } from "src/utils/make-page";
import { useCreatePage } from "src/hooks/use-create-page";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage as updatePage } from "src/api/pages";
import { SidebarBodySkeleton } from "./components/skeletons";
import { useActivePage } from "./context/active-page-context";
import {
  Section,
  SectionMenuItem,
  SectionMenuLabel,
  SectionMenuSeparator,
} from "./components/section";
import { ScrollFog } from "src/components/tiptap-ui-primitive/scroll-frog";
import { useLibrary } from "./context/library-context";
import { useLocalStorage } from "./hooks/use-local-storage";
import { useTemplates } from "./context/templates-context";
import { ShortcutBadge } from "src/components/tiptap-ui-primitive/shortcut-badge";
import type { Teamspace } from "src/types";

function User() {
  const { collapsed, onCollapsedChange } = useEditorLayout();

  const onToggle = useCallback(
    () => onCollapsedChange(!collapsed),
    [onCollapsedChange, collapsed],
  );

  return (
    <ButtonGroup
      orientation="horizontal"
      style={{ width: "100%", justifyContent: "flex-start" }}
    >
      {/**
       */}
      <Button
        style={{
          minWidth: 22,
          width: 22,
          minHeight: 22,
          height: 22,
          borderRadius: "var(--tt-radius-sm)",
        }}
        className="name-initial"
        data-highlighted={true}
      >
        <span className="tiptap-button-icon">S</span>
      </Button>
      <Spacer orientation="horizontal" size={5} />
      <span
        style={{
          color: "var(--tt-text-primary)",
          fontSize: 14,
          fontWeight: 600,
          fontFamily:
            'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Display", "Segoe UI", Helvetica, Arial, sans-serif',
        }}
      >
        Souleymane Sall's space
      </span>
      <Spacer orientation="horizontal" />

      <Button variant="ghost" tooltip="Collapse" onClick={onToggle}>
        <PanelLeft
          className="tiptap-button-icon"
          // fill="var(--tt-brand-color-400)"
        />
        {/* <ChevronsLeft className="tiptap-button-icon" /> */}
      </Button>
    </ButtonGroup>
  );
}

function WorkspaceHeader() {
  const { collapsed, onCollapsedChange } = useEditorLayout();
  const [, setHide] = useState(true);

  const onToggle = useCallback(
    () => onCollapsedChange(!collapsed),
    [onCollapsedChange, collapsed],
  );
  return (
    <CardItemGroup
      orientation={collapsed ? "vertical" : "horizontal"}
      onMouseLeave={() => setHide(true)}
      onMouseOver={() => setHide(false)}
      style={{
        width: "100%",
        paddingLeft: !collapsed ? 7 : 0,
        border: "none",
      }}
    >
      {/* {!collapsed && <Logo collapsed={collapsed} />} */}
      {!collapsed && <User />}

      <Spacer orientation="horizontal" />

      {collapsed && (
        <Button
          variant="ghost"
          onClick={onToggle}
          tooltip={"Expand"}
          style={{ justifyContent: "flex-start" }}
        >
          <PanelRight
            style={{ minWidth: 18, width: 18, minHeight: 18, height: 18 }}
            className="tiptap-button-icon"
          />
        </Button>
      )}
    </CardItemGroup>
  );
}

function WorkSpaceFooter({
  onOpenTemplatesGallery,
  onCreatePage,
}: {
  onOpenTemplatesGallery?: () => void;
  onCreatePage?: () => void;
}) {
  return (
    <CardFooter
      style={{
        position: "sticky",
        bottom: 0,
        zIndex: 5,
        minHeight: 50,
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "center",
        width: "100%",
        padding: "0 15px",
        borderTop: "0.5px solid var(--tt-border-color)",
        // translucent sidebar bg + blur = the frost. Opaque bg kills the effect.
        background:
          "color-mix(in srgb, var(--sidebar-bg-color) 70%, transparent)",
        backdropFilter: "blur(12px) saturate(1.4)",
        WebkitBackdropFilter: "blur(12px) saturate(1.4)",
      }}
    >
      {/* the fog: fades scrolling list into the sidebar bg, just above the bar */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: "100%",
          height: 36,
          pointerEvents: "none",
          background:
            "linear-gradient(to top, var(--sidebar-bg-color), transparent)",
        }}
      />

      <CardItemGroup
        orientation="horizontal"
        style={{
          width: "100%",
          justifyContent: "flex-start",
          alignItems: "center",
          marginBottom: 5,
          gap: 10,
        }}
      >
        <Button
          aria-label="Browse templates"
          variant="ghost"
          // data-active-state="on"
          style={{
            padding: "20.5px 10px",
            borderRadius: "100px",
            border: "1px solid var(--tt-border-color)",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
          onClick={onOpenTemplatesGallery}
        >
          <LayoutTemplate className="tiptap-button-icon" />
          <span
            className="tiptap-button-text"
            style={{ whiteSpace: "nowrap", color: "var(--tt-text-color)" }}
          >
            Browse templates
          </span>

          <ShortcutBadge shortcutKeys="Ctrl+O" />
        </Button>

        <Button
          aria-label="Create new page"
          variant="ghost"
          onClick={onCreatePage}
          tooltip="Create Page"
          style={{
            padding: "20px 20.5px",
            borderRadius: "100px",
            border: "1px solid var(--tt-border-color)",
          }}
        >
          <SquarePen className="tiptap-button-icon" />
        </Button>
      </CardItemGroup>
    </CardFooter>
  );
}

function NavItems() {
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
          {!collapsed && <span className="tiptap-button-text">Home</span>}
        </Button>
        <Spacer orientation="horizontal" size={2.5} />
        <ButtonGroup orientation="horizontal" style={{ maxWidth: "90px" }}>
          <Button
            variant="ghost"
            // data-active-state={libraryOpen ? "on" : "off"}
            onClick={handleLibraryClick}
            style={{ fontWeight: 400, color: "var(--tt-text-color)" }}
            tooltip="Library"
          >
            <LibraryBig
              size={32}
              strokeWidth={1.8}
              className="tiptap-button-icon"
            />
          </Button>
          <Button
            variant="ghost"
            onClick={handleHomeClick}
            style={{ fontWeight: 400, color: "var(--tt-text-color)" }}
          >
            <Inbox size={32} strokeWidth={1.8} className="tiptap-button-icon" />
            <Spacer orientation="horizontal" size={1} />
            {/* {!collapsed && <span className="tiptap-button-text">Inbox</span>} */}
          </Button>

          <Button
            variant="ghost"
            style={{ fontWeight: 400, color: "var(--tt-text-color)" }}
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
          variant="ghost"
          onClick={() => onOpenChange?.(true)}
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
  return (
    <Section
      label="Showcase"
      defaultCollapsed={false}
      badge={
        <span className="sidebar-section__badge">
          <Sparkles size={11} />
          Feature of the week
        </span>
      }
    >
      <div className="sidebar-showcase-empty">
        <Sparkles size={16} className="sidebar-showcase-empty__icon" />
        <div className="sidebar-showcase-empty__text">
          <span className="sidebar-showcase-empty__title">
            Your work, out in the open
          </span>
          <span className="sidebar-showcase-empty__desc">
            Home for the things you build — apps, designs, animations, films,
            pitches — and the events that put them on stage.
          </span>
        </div>
      </div>
    </Section>
  );
}

// ── RecentSection: persisted limit + collapse ────────────────────────────────
const RECENT_LIMIT_OPTIONS = [5, 10, 20] as const;
function RecentSection({
  onMoveUp,
  onMoveDown,
}: {
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const { data: recentPages } = useRecentPages();
  const [limit, setLimit] = useLocalStorage<number | "all">(
    "folio:recents:limit",
    10,
  );

  const { setActiveTab } = useLibrary();
  if (!recentPages || recentPages.length === 0) return null;

  const handleLibraryClick = () => {
    setActiveTab("Recents");
  };
  const visible = limit === "all" ? recentPages : recentPages.slice(0, limit);

  return (
    <Section
      label="Recents"
      defaultCollapsed={false}
      persistKey="folio:recents:collapsed"
      menuLabel="Recents options"
      menu={
        <>
          <SectionMenuLabel>Show</SectionMenuLabel>
          {RECENT_LIMIT_OPTIONS.map((n) => (
            <SectionMenuItem
              key={n}
              label={`${n} items`}
              selected={limit === n}
              closeOnClick={false}
              onClick={() => setLimit(n)}
            />
          ))}
          <SectionMenuItem
            label="All items"
            selected={limit === "all"}
            closeOnClick={false}
            onClick={() => setLimit("all")}
          />
          <SectionMenuSeparator />
          <SectionMenuItem
            icon={<ArrowUp size={14} />}
            label="Move up"
            onClick={onMoveUp}
            disabled={!onMoveUp}
          />
          <SectionMenuItem
            icon={<ArrowDown size={14} />}
            label="Move down"
            onClick={onMoveDown}
            disabled={!onMoveDown}
          />
        </>
      }
      hasLibrary={true}
      onLibraryClick={handleLibraryClick}
    >
      <CardItemGroup style={{ gap: 2.8 }}>
        {visible.map((page) => (
          <PageItem key={page.id} page={page} />
        ))}
      </CardItemGroup>
    </Section>
  );
}

// ── main component: lens + tree + mutation hooks ─────────────────────────────
export function SimpleEditorSidebar() {
  const { collapsed, sidebarWidth } = useEditorLayout();
  const { tree, data: pages, isPending, isLoading } = usePageTree();
  // No current-user concept yet, so show ALL teamspaces as sections. When a
  // session/current-person lands, filter with isTeamspaceMember(ts, me, groups)
  // from src/types/page-teamspaces.
  const { data: teamspaces = [] } = useTeamspaces();
  const patchPage = usePatchPage(({ id, patch }) => updatePage(id, patch));
  const createPage = useCreatePage();
  const { setActivePageId, activePageId } = useActivePage();
  const { onOpenChange: onTemplatesGalleryOpenChange } = useTemplates();

  const onCreatePage = () => {
    const newPage = makePage({
      title: "New Page",
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

  if (isPending || !pages) return null;

  return (
    <Card
      className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}
      style={{
        zIndex: 120,
        position: "fixed",
        left: 0,
        borderRadius: 0,
        width: sidebarWidth,
        // boxShadow: "none",
        //width: collapsed ? 52 : 290,
        transition: "width 0.2s ease",
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardHeader style={{ border: "none" }}>
        <CardItemGroup orientation="vertical" style={{ width: "100%" }}>
          <WorkspaceHeader />
          <Spacer orientation="vertical" size={4} />
          <NavItems />
        </CardItemGroup>
      </CardHeader>

      <CardBody style={{ width: "100%", padding: "0 12px" }}>
        {/* <Spacer orientation="vertical" size={20} /> */}
        {!collapsed &&
          (isPending || isLoading || !pages ? (
            <SidebarBodySkeleton />
          ) : (
            <>
              <ScrollFog edge="top" color="var(--sidebar-fog-color)" />
              <Spacer orientation="vertical" size={15} />

              <ShowcaseSection />
              <Spacer orientation="vertical" size={15} />

              {pages.length > 0 && <RecentSection />}
              <Spacer orientation="vertical" size={10} />
              <SidebarTree
                tree={tree}
                teamspaces={teamspaces as Teamspace[]}
                onMovePage={({
                  pageId,
                  newParentId,
                  category,
                  teamspaceId,
                }) => {
                  // optimistic move — patch parentId, plus the destination's
                  // location identity (category OR teamspaceId) when it changed.
                  // teamspaceId uses !== undefined because null is a real value
                  // (it means "pull this page out of any teamspace").
                  patchPage.mutate({
                    id: pageId,
                    patch: {
                      parentId: newParentId,
                      ...(category !== undefined ? { category } : {}),
                      ...(teamspaceId !== undefined ? { teamspaceId } : {}),
                    },
                  });
                }}
                onAddPageToSection={(target) => {
                  const base = makePage({
                    title: "New Page",
                    parentId: null,
                    category:
                      target.kind === "category" ? target.category : "Private",
                  });
                  const p =
                    target.kind === "teamspace"
                      ? { ...base, teamspaceId: target.teamspaceId }
                      : base;
                  createPage
                    .mutateAsync(p)
                    .then((page) => setActivePageId(page.id));
                }}
                onRenameSection={() => {}}
                onDeleteSection={() => {}}
                onAddSection={() => {}}
              />
            </>
          ))}
      </CardBody>

      {/* <Separator orientation="horizontal" style={{ height: 0.5 }} /> */}
      {!collapsed && (
        <WorkSpaceFooter
          onCreatePage={onCreatePage}
          onOpenTemplatesGallery={() => onTemplatesGalleryOpenChange?.(true)}
        />
      )}
    </Card>
  );
}
