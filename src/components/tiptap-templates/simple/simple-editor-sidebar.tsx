import {
  Search,
  Home,
  Inbox,
  Store,
  LibraryBig,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  ChevronUp,
  Settings,
  MoreHorizontal,
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
import { useLibrary } from "./context/library-context";
import { PageItem } from "./page-item";
import { SidebarTree } from "./components/sidebar-tree";
import { usePageTree, useRecentPages } from "src/hooks/use-pages";
import { makePage } from "src/utils/make-page";
import { useCreatePage } from "src/hooks/use-create-page";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage as updatePage } from "src/api/pages";
import { SidebarBodySkeleton } from "./components/skeletons";
import { usePageView } from "./context/page-view-context";
import { useActivePage } from "./context/active-page-context";

function User() {
  const { collapsed, onCollapsedChange } = useEditorLayout();

  const onToggle = useCallback(
    () => onCollapsedChange(!collapsed),
    [onCollapsedChange, collapsed],
  );

  return (
    <ButtonGroup orientation="horizontal">
      <Button
        style={{
          minWidth: 22,
          width: 22,
          minHeight: 22,
          height: 22,
          borderRadius: "var(--tt-radius-sm)",
        }}
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
      <Button variant="ghost" tooltip="Collapse" onClick={onToggle}>
        <ChevronsLeft className="tiptap-button-icon" />
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
          <ChevronsRight
            style={{ minWidth: 18, width: 18, minHeight: 18, height: 18 }}
            className="tiptap-button-icon"
          />
        </Button>
      )}
    </CardItemGroup>
  );
}

function WorkSpaceFooter({
  onSettingsClick,
  onCreatePage,
}: {
  onSettingsClick?: () => void;
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
          gap: 5,
        }}
      >
        <Button
          style={{
            minWidth: 32,
            width: 32,
            height: 32,
            minHeight: 32,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            borderRadius: "100%",
          }}
        >
          <span
            className="tiptap-button-text"
            style={{ textAlign: "center", fontSize: 14, fontWeight: 600 }}
          >
            J
          </span>
        </Button>

        <CardItemGroup>
          <span style={{ fontSize: 12, color: "var(--tt-text-primary)" }}>
            Jule
          </span>
          <span style={{ fontSize: 10, color: "var(--tt-text-secondary)" }}>
            Pro plan
          </span>
        </CardItemGroup>

        <CardItemGroup
          orientation="horizontal"
          style={{ marginLeft: "auto", gap: 4, alignItems: "center" }}
        >
          <Button
            variant="ghost"
            aria-label="Settings"
            onClick={onSettingsClick}
            style={{
              minWidth: 32,
              width: 32,
              height: 32,
              minHeight: 32,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              borderRadius: "var(--tt-radius-md)",
              color: "var(--tt-text-secondary)",
            }}
          >
            <Settings size={16} />
          </Button>

          <Button
            aria-label="Create new page"
            onClick={onCreatePage}
            style={{
              minWidth: 32,
              width: 32,
              height: 32,
              minHeight: 32,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              borderRadius: "var(--tt-radius-md)",
              background: "var(--tt-brand-color-400)",
              color: "#fff",
            }}
          >
            <Plus size={16} />
          </Button>
        </CardItemGroup>
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
  const { open, onOpenChange } = useSearch();
  const { open: libraryOpen, onOpenChange: onLibraryOpenChange } = useLibrary();

  return (
    <CardItemGroup orientation="vertical" style={{ width: "100%", gap: 0 }}>
      <ButtonGroup className="sidebar-nav-item" orientation="vertical">
        <Button
          variant="ghost"
          onClick={() => onOpenChange?.(true)}
          style={{
            fontWeight: 400,
            color: "var(--tt-text-color)",
            minHeight: 32,
            height: 32,
          }}
          data-active-state={open ? "on" : "off"}
        >
          <Search size={32} className="tiptap-button-icon" />
          <Spacer orientation="horizontal" size={1} />
          {!collapsed && <span className="tiptap-button-text">Search</span>}
        </Button>

        <Button
          variant="ghost"
          onClick={handleHomeClick}
          style={{ fontWeight: 400, color: "var(--tt-text-color)" }}
        >
          <Inbox size={32} strokeWidth={1.8} className="tiptap-button-icon" />
          <Spacer orientation="horizontal" size={1} />
          {!collapsed && <span className="tiptap-button-text">Inbox</span>}
        </Button>

        <Button
          variant="ghost"
          data-active-state={libraryOpen ? "on" : "off"}
          onClick={() => onLibraryOpenChange?.(true)}
          style={{ fontWeight: 400, color: "var(--tt-text-color)" }}
        >
          <LibraryBig
            size={32}
            strokeWidth={1.8}
            className="tiptap-button-icon"
          />
          <Spacer orientation="horizontal" size={1} />
          {!collapsed && <span className="tiptap-button-text">Library</span>}
        </Button>
      </ButtonGroup>

      {/* Separator between the two behaviors */}
      {/* {collapsed ? (
        <Separator orientation="horizontal" style={{ height: 0.5 }} />
      ) : (
        <>
          <Spacer orientation="vertical" size={10} />
          <span className="sidebar-section-label">Browse</span>
        </>
      )} */}

      {/* Browse — full-page destinations (Home, Marketplace) */}
      <ButtonGroup className="sidebar-nav-item" orientation="vertical">
        <Button
          variant="ghost"
          onClick={handleHomeClick}
          style={{
            fontWeight: 400,
            color: "var(--tt-text-color)",
            minHeight: 32,
            height: 32,
          }}
        >
          <Home size={32} strokeWidth={1.8} className="tiptap-button-icon" />
          <Spacer orientation="horizontal" size={1} />
          {!collapsed && <span className="tiptap-button-text">Home</span>}
        </Button>

        <Button
          variant="ghost"
          style={{ fontWeight: 400, color: "var(--tt-text-color)" }}
        >
          <Store size={32} strokeWidth={1.8} className="tiptap-button-icon" />
          <Spacer orientation="horizontal" size={1} />
          {!collapsed && (
            <span className="tiptap-button-text">Marketplace</span>
          )}
        </Button>
      </ButtonGroup>
    </CardItemGroup>
  );
}

function ScrollFog({
  edge,
  height = 28,
}: {
  edge: "top" | "bottom";
  height?: number;
}) {
  const isTop = edge === "top";
  return (
    <div
      aria-hidden
      style={{
        position: "sticky",
        top: isTop ? 0 : undefined,
        bottom: isTop ? undefined : 0,
        height,
        // negative margin pulls it out of flow so it overlays rows, not pushes them
        marginBottom: isTop ? -height : undefined,
        marginTop: isTop ? undefined : -height,
        pointerEvents: "none",
        zIndex: 2,
        background: `linear-gradient(to ${
          isTop ? "bottom" : "top"
        }, var(--sidebar-bg-color), transparent)`,
      }}
    />
  );
}

// ── RecentSection: just use the lens ─────────────────────────────────────────
function RecentSection() {
  const COLLAPSED_COUNT = 8;
  const { data: recentPages } = useRecentPages(); // all, recent-first
  const createPage = useCreatePage();
  const [expanded, setExpanded] = useState(false);

  const handleNewPage = () => {
    const page = makePage({
      title: "New Page",
      parentId: null,
      category: "Private",
    });
    createPage.mutate(page); // client id known up front
    // activate it if you want: setActivePageId(page.id)
  };

  if (!recentPages) return null;

  const hasMore = recentPages.length > COLLAPSED_COUNT;
  const visiblePages =
    expanded || !hasMore ? recentPages : recentPages.slice(0, COLLAPSED_COUNT);

  return (
    <CardItemGroup className="sidebar-section" orientation="vertical">
      {/* <ScrollFog edge="top" /> */}
      {recentPages.length > 0 && (
        <>
          <span className="sidebar-section__label">Recents</span>
          <Spacer orientation="vertical" size={5} />
          <CardItemGroup style={{ gap: 2.8 }}>
            {visiblePages.map((page) => (
              <PageItem key={page.id} page={page} />
            ))}
          </CardItemGroup>
          <Spacer orientation="vertical" size={5} />

          {hasMore && (
            <Button
              variant="ghost"
              style={{
                justifyContent: "flex-start",
                borderRadius: "var(--tt-radius-sm)",
                background: "transparent",
                color: "var(--sidebar-text-secondary)",
                fontWeight: 500,
                fontFamily: "Inter, -apple-system, system-ui, sans-serif",
              }}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? (
                <ChevronUp
                  stroke="var(--sidebar-text-secondary)"
                  className="tiptap-button-icon"
                />
              ) : (
                <MoreHorizontal
                  stroke="var(--sidebar-text-secondary)"
                  className="tiptap-button-icon"
                />
              )}
              <Spacer orientation="horizontal" size={2} />
              <span className="tiptap-button-text" style={{ fontSize: 13 }}>
                {expanded ? "Less" : "More"}
              </span>
            </Button>
          )}
        </>
      )}
      <Spacer orientation="vertical" size={1.5} />
      <Button
        variant="ghost"
        style={{
          justifyContent: "flex-start",
          borderRadius: "var(--tt-radius-sm)",
          fontSize: 13,
          lineHeight: 1.4,
          color: "var(--tt-brand-color-400)",
        }}
        onClick={handleNewPage}
      >
        <Plus
          stroke="var(--tt-brand-color-400)"
          className="tiptap-button-icon"
        />
        <Spacer orientation="horizontal" size={2} />
        <span className="tiptap-button-text">New Page</span>
      </Button>
    </CardItemGroup>
  );
}

// ── main component: lens + tree + mutation hooks ─────────────────────────────
export function SimpleEditorSidebar() {
  const { collapsed, sidebarWidth } = useEditorLayout();
  const { tree, data: pages, isPending, isLoading } = usePageTree();
  const patchPage = usePatchPage(({ id, patch }) => updatePage(id, patch));
  const createPage = useCreatePage();
  const { setTarget } = usePageView();
  const { setActivePageId } = useActivePage();

  const onCreatePage = () => {
    const newPage = makePage({
      title: "New Page",
      parentId: null,
      category: "Private",
    });
    createPage
      .mutateAsync(newPage)
      .then((page) => setTarget({ pageId: page.id, view: "Center" }))
      .catch(() => console.log("failed to create new page"));
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

      <CardBody style={{ width: "100%", padding: "0 8px" }}>
        {/* <Spacer orientation="vertical" size={20} /> */}
        {!collapsed &&
          (isPending || isLoading || !pages ? (
            <SidebarBodySkeleton />
          ) : (
            <>
              <ScrollFog edge="top" />
              <Spacer orientation="vertical" size={15} />

              {pages.length > 0 && <RecentSection />}
              <Spacer orientation="vertical" size={10} />
              <SidebarTree
                tree={tree}
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
                  const p = makePage({
                    title: "New Page",
                    parentId: null,
                    category,
                  });
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
      <WorkSpaceFooter onCreatePage={onCreatePage} />
    </Card>
  );
}
