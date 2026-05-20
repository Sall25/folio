import {
  Search,
  Home,
  LayoutTemplate,
  PanelRight,
  PanelLeft,
  Plus,
  MessageCircle,
  Inbox,
  Mic,
  Library,
  Store,
  LibraryBig,
} from "lucide-react";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardFooter,
  CardGroupLabel,
  CardHeader,
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

function User({ name }: { name: string }) {
  return (
    <CardItemGroup
      orientation="horizontal"
      style={{
        width: "100%",
        justifyContent: "flex-start",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "var(--logo-mark-bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 600,
          color: "#fff",
          flexShrink: 0,
          letterSpacing: 0.2,
        }}
      >
        JS
      </div>
      <CardItemGroup>
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: 12,
            display: "inline-block",
            fontWeight: "600",
            fontFamily: "inherit",
          }}
        >
          {name}
        </span>
        <span style={{ fontSize: 10, opacity: 0.8 }}>Pro plan</span>
      </CardItemGroup>
    </CardItemGroup>
  );
}

function CreatePageButton() {
  const { addPageAndActivateAsync } = useActivePage();
  return (
    <Button
      variant="ghost"
      tooltip={"Add new page"}
      onClick={async () => {
        await addPageAndActivateAsync({ title: "New Page", parentId: null });
      }}
      style={{
        justifyContent: "flex-start",
        borderRadius: "var(--tt-radius-sm)",
        fontSize: 13,
        marginTop: 10,
      }}
    >
      <Plus className="tiptap-button-icon" />
      <span className="tiptap-button-text">New Page</span>
    </Button>
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
    <CardHeader>
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
    </CardHeader>
  );
}

function SidebarTabs() {
  const { collapsed } = useEditorLayout();
  return (
    <ButtonGroup
      orientation={collapsed ? "vertical" : "horizontal"}
      style={{
        gap: 3,
        width: "100%",
        marginTop: 10,
        marginRight: 5,
        padding: "5px 10px",
      }}
    >
      <Button className="sidebar-tab">
        <Home className="sidebar-tab-icon" />
        {!collapsed && <span className="sidebar-tab-label">Home</span>}
      </Button>

      <Spacer orientation="horizontal" />

      <ButtonGroup orientation="horizontal">
        <Button
          className="sidebar-tab"
          variant="ghost"
          tooltip="Comments"
          style={{ background: "transparent" }}
        >
          <MessageCircle className="sidebar-tab-icon" />
        </Button>

        <Button
          className="sidebar-tab"
          variant="ghost"
          tooltip="Meetings"
          style={{ background: "transparent" }}
        >
          <Mic className="sidebar-tab-icon" />
        </Button>
        <Button
          className="sidebar-tab"
          variant="ghost"
          tooltip="Notifications"
          style={{ background: "transparent" }}
        >
          <Inbox className="sidebar-tab-icon" />
        </Button>
      </ButtonGroup>

      <Spacer orientation="horizontal" />

      <Button
        className="sidebar-tab"
        variant="ghost"
        tooltip="Search"
        style={{ background: "transparent" }}
      >
        <Search className="sidebar-tab-icon" />
      </Button>
    </ButtonGroup>
  );
}

function NavItems() {
  const { collapsed } = useEditorLayout();
  const { debounceUpdatePage } = useActivePage();
  const navigate = useNavigate();

  const handleHomeClick = () => {
    debounceUpdatePage.flush();
    navigate({ to: "/" });
  };

  return (
    <ButtonGroup className="sidebar-nav-item" orientation="vertical">
      <Button variant="ghost" onClick={handleHomeClick}>
        <LibraryBig
          size={32}
          strokeWidth={1.8}
          className="tiptap-button-icon"
        />
        {/* <Library strokeWidth={2.5} className="tiptap-button-icon" /> */}
        {!collapsed && <span className="tiptap-button-text">Library</span>}
      </Button>
      <Button variant="ghost" style={{ fontWeight: 500 }}>
        <Store size={32} strokeWidth={1.8} className="tiptap-button-icon" />
        {!collapsed && <span className="tiptap-button-text">Marketplace</span>}
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
            <CardGroupLabel style={{ color: "var(--tt-paragraph-text-color)" }}>
              Recents
            </CardGroupLabel>
            <CardItemGroup style={{ gap: 2 }}>
              {recentPages.map((page) => (
                <PageItem key={page.id} page={page} />
              ))}
            </CardItemGroup>
          </>
        )}

        <CreatePageButton />

        <Separator orientation="horizontal" style={{ height: 0.5 }} />

        <CardGroupLabel>Pages</CardGroupLabel>

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
  const { collapsed } = useEditorLayout();
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
        boxShadow: "none",
        width: collapsed ? 52 : 290,
        transition: "width 0.2s ease",
      }}
    >
      <WorkspaceHeader />
      <SidebarTabs />
      <NavItems />
      <Separator orientation="horizontal" />
      {!collapsed && <PagesList pages={pages} />}
      {!collapsed && (
        <>
          <Separator orientation="horizontal" />
          <CardFooter style={{ width: "100%" }}>
            <User name="Jule Sall" />
          </CardFooter>
        </>
      )}
    </Card>
  );
}
