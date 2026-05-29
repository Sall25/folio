import {
  Search,
  Home,
  PanelRight,
  PanelLeft,
  Plus,
  Inbox,
  Store,
  LibraryBig,
} from "lucide-react";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardGroupLabel,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Separator } from "src/components/tiptap-ui-primitive/separator";

import "./simple-editor-sidebar.scss";
import { PageItem } from "./page-item";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-location";
import { useActivePage } from "./use-active-page";
import { useEditorLayout } from "./context/editor-layout-context";
import type { Page } from "./types";
import { Logo } from "./components";
import { useCreatePage } from "./context/create-page-context";
import { usePages } from "./use-pages";

function WorkspaceHeader() {
  const { collapsed, onCollapsedChange } = useEditorLayout();
  const [, setHide] = useState(true);

  const onToggle = useCallback(
    () => onCollapsedChange(!collapsed),
    [onCollapsedChange, collapsed],
  );

  return (
    <CardItemGroup
      style={{ padding: !collapsed ? "5px 15px" : 0, width: "100%" }}
    >
      <CardItemGroup
        orientation={collapsed ? "vertical" : "horizontal"}
        onMouseLeave={() => setHide(true)}
        onMouseOver={() => setHide(false)}
        style={{ width: "100%" }}
      >
        {!collapsed && <Logo collapsed={collapsed} />}

        <Spacer orientation="horizontal" />
        <Button
          variant="ghost"
          className="sidebar-collapse-btn"
          onClick={onToggle}
          tooltip={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? (
            <PanelRight
              size={14}
              className="tiptap-button-icon"
              style={{ width: 20, height: 18 }}
            />
          ) : (
            <PanelLeft
              size={14}
              className="tiptap-button-icon"
              style={{ width: 20, height: 18 }}
            />
          )}
        </Button>
      </CardItemGroup>
    </CardItemGroup>
  );
}
function NavItems() {
  const { collapsed } = useEditorLayout();
  const { debounceUpdatePage } = useActivePage();
  const { addPageAsync } = usePages();
  const { setCreatePageId } = useCreatePage();
  const navigate = useNavigate();

  const handleHomeClick = () => {
    debounceUpdatePage.flush();
    navigate({ to: "/" });
  };

  const handleNewPage = async () => {
    const newPage = await addPageAsync({
      title: "New Page",
      parentId: null,
    });
    if (newPage?.id != null) {
      setCreatePageId(newPage.id);
    }
  };

  return (
    <ButtonGroup className="sidebar-nav-item" orientation="vertical">
      <Button
        variant="ghost"
        onClick={handleHomeClick}
        style={{ fontWeight: 400, color: "var(--tt-text-color)" }}
      >
        <Search size={32} strokeWidth={1.8} className="tiptap-button-icon" />
        <Spacer orientation="horizontal" size={4} />
        {!collapsed && <span className="tiptap-button-text">Search</span>}
      </Button>

      <Button
        variant="ghost"
        onClick={handleHomeClick}
        style={{ fontWeight: 400, color: "var(--tt-text-color)" }}
      >
        <Home size={32} strokeWidth={1.8} className="tiptap-button-icon" />
        <Spacer orientation="horizontal" size={2} />
        {!collapsed && <span className="tiptap-button-text">Home</span>}
      </Button>

      <Button
        variant="ghost"
        onClick={handleHomeClick}
        style={{ fontWeight: 400, color: "var(--tt-text-color)" }}
      >
        <Inbox size={32} strokeWidth={1.8} className="tiptap-button-icon" />
        <Spacer orientation="horizontal" size={2} />
        {!collapsed && <span className="tiptap-button-text">Inbox</span>}
      </Button>

      <Button
        variant="ghost"
        onClick={handleHomeClick}
        style={{ fontWeight: 400, color: "var(--tt-text-color)" }}
      >
        <LibraryBig
          size={32}
          strokeWidth={1.8}
          className="tiptap-button-icon"
        />
        <Spacer orientation="horizontal" size={2} />
        {!collapsed && <span className="tiptap-button-text">Library</span>}
      </Button>

      <Button
        variant="ghost"
        style={{ fontWeight: 400, color: "var(--tt-text-color)" }}
      >
        <Store size={32} strokeWidth={1.8} className="tiptap-button-icon" />
        <Spacer orientation="horizontal" size={2} />
        {!collapsed && <span className="tiptap-button-text">Marketplace</span>}
      </Button>

      <Button
        variant="ghost"
        onClick={handleNewPage}
        style={{ fontWeight: 400, color: "var(--tt-text-color)" }}
      >
        <Plus
          size={32}
          strokeWidth={1.8}
          className="tiptap-button-icon"
          style={{
            borderRadius: "var(--tt-radius-xl)",
            background: "var(--tt-button-hover-bg-color)",
            padding: 2,
            width: 19,
            height: 19,
          }}
        />
        <Spacer orientation="horizontal" size={4} />
        {!collapsed && <span className="tiptap-button-text">New Page</span>}
      </Button>
    </ButtonGroup>
  );
}
function flattenPages(pages: Page[]): Page[] {
  return pages.flatMap((p) => [p, ...flattenPages(p.children ?? [])]);
}

function PagesList({ pages }: { pages: Page[] }) {
  const recentPages = useMemo(
    () =>
      flattenPages(pages)
        .filter((p) => p.updatedAt !== null && p.category !== "Template")
        .sort(
          (a, b) =>
            new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime(),
        )
        .slice(0, 5),
    [pages],
  );

  const otherPages = useMemo(
    () => pages.filter((p) => p.category !== "Template"),
    [pages],
  );

  const templatePages = useMemo(
    () => flattenPages(pages).filter((p) => p.category === "Template"),
    [pages],
  );

  return (
    <CardItemGroup className="sidebar-pages">
      <CardItemGroup orientation="vertical">
        {recentPages.length > 0 && (
          <>
            <span className="title">Recents</span>
            <CardItemGroup style={{ gap: 4 }}>
              {recentPages.map((page) => (
                <PageItem key={page.id} page={page} disableExpand={true} />
              ))}
            </CardItemGroup>
          </>
        )}

        <Separator orientation="horizontal" style={{ height: 0.5 }} />

        <span className="title">Pages</span>

        {otherPages.length === 0 && (
          <p className="sidebar-empty">No pages yet.</p>
        )}

        <CardItemGroup style={{ gap: 2 }}>
          {otherPages.map((page) => (
            <PageItem
              key={page.id}
              page={page}
              disableActive={recentPages.some((r) => r.id === page.id)}
            />
          ))}
        </CardItemGroup>

        {templatePages.length > 0 && (
          <>
            <Separator orientation="horizontal" style={{ height: 0.5 }} />
            <CardGroupLabel>Templates</CardGroupLabel>
            <CardItemGroup style={{ gap: 2 }}>
              {templatePages.map((page) => (
                <PageItem key={page.id} page={page} />
              ))}
            </CardItemGroup>
          </>
        )}
      </CardItemGroup>
    </CardItemGroup>
  );
}

export function SimpleEditorSidebar() {
  const { collapsed, sidebarWidth } = useEditorLayout();
  const { pages } = useActivePage();

  if (!pages) return null;

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
      <WorkspaceHeader />
      <Spacer orientation="vertical" size={6} />
      <NavItems />
      <Separator orientation="horizontal" style={{ height: 0.5 }} />
      {!collapsed && <PagesList pages={pages} />}
      {/* {!collapsed && (
        <>
          <Separator orientation="horizontal" />
          <CardFooter style={{ width: "100%" }}>
            <User name="Jule Sall" />
          </CardFooter>
        </>
      )} */}
    </Card>
  );
}
