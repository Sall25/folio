// simple-editor-sidebar.tsx
import {
  Search,
  Home,
  LayoutTemplate,
  Lock,
  Users,
  PanelRight,
  PanelLeft,
  Plus,
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
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-location";
import { useActivePage } from "./use-active-page";
import type { Page } from "./types";
import { Logo } from "./components";

function User({ name }: { name: string }) {
  return (
    <CardItemGroup
      orientation="horizontal"
      style={{ width: "100%", justifyContent: "flex-start" }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "var(--tt-radius-md)",
          background: "var(--tt-brand-color-400)",
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
            fontSize: 13,
            display: "inline-block",
            fontWeight: "400",
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
        // fontFamily: "inherit",
        fontSize: 13,
        marginTop: 10,
      }}
    >
      <Plus className="tiptap-button-icon" />
      <span className="tiptap-button-text">New Page</span>
    </Button>
  );
}

function WorkspaceHeader({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const [, setHide] = useState(true);

  return (
    <CardHeader>
      <CardItemGroup
        orientation={collapsed ? "vertical" : "horizontal"}
        onMouseLeave={() => setHide(true)}
        onMouseOver={() => setHide(false)}
        style={{ width: "100%" }}
      >
        {/* <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            background: "var(--tt-brand-color-400)",
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
        </div> */}
        {!collapsed && <Logo collapsed={collapsed} />}

        {/* {!collapsed && <CreatePageButton />} */}

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

        {/* {!collapsed && <WorkSpaceOptions />} */}
      </CardItemGroup>
    </CardHeader>
  );
}

function NavItems({ collapsed }: { collapsed: boolean }) {
  const { debounceUpdatePage } = useActivePage();
  const navigate = useNavigate();
  const handleHomeClick = () => {
    debounceUpdatePage.flush();
    navigate({ to: "/" });
  };
  return (
    <ButtonGroup
      style={{ gap: 3, width: "100%", marginTop: 10, marginRight: 5 }}
    >
      <ButtonGroup
        style={{ gap: 3, width: "100%" }}
        orientation="vertical"
        // orientation={collapsed ? "vertical" : "horizontal"}
      >
        <Button
          variant="ghost"
          title="Home"
          onClick={handleHomeClick}
          style={{
            padding: "3px 10px",
            minHeight: 20,
            height: 28,
            // fontFamily: "inherit",
          }}
        >
          <Home strokeWidth={2.25} className="tiptap-button-icon" />
          {!collapsed && <span className="tiptap-button-text">Home</span>}
        </Button>

        <Spacer orientation={collapsed ? "vertical" : "horizontal"} />

        <Button
          variant="ghost"
          title="Search"
          style={{
            padding: "3px 10px",
            minHeight: 20,
            height: 28,
            // fontFamily: "inherit",
          }}
        >
          <Search className="tiptap-button-icon" />
          {!collapsed && <span className="tiptap-button-text">Search</span>}
        </Button>

        <Spacer orientation={collapsed ? "vertical" : "horizontal"} />

        <Button
          variant="ghost"
          title="Templates"
          // style={{ fontFamily: "inherit" }}
        >
          <LayoutTemplate strokeWidth={2.25} className="tiptap-button-icon" />
          {!collapsed && <span className="tiptap-button-text">Templates</span>}
        </Button>

        <Spacer orientation={collapsed ? "vertical" : "horizontal"} />

        <Button variant="ghost">
          <Lock className="tiptap-button-icon" />
          {!collapsed && <span className="tiptap-button-text">Private</span>}
        </Button>

        <Spacer orientation={collapsed ? "vertical" : "horizontal"} />

        <Button variant="ghost">
          <Users className="tiptap-button-icon" />
          {!collapsed && <span className="tiptap-button-text">Shared</span>}
        </Button>
      </ButtonGroup>
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
      {recentPages.length > 0 && (
        <>
          <CardGroupLabel>Recents</CardGroupLabel>
          <CardItemGroup style={{ gap: 5 }}>
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

      <CardItemGroup style={{ gap: 5 }}>
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
          <CardItemGroup style={{ gap: 5 }}>
            {templatePages.map((page) => (
              <PageItem key={page.id} page={page} />
            ))}
          </CardItemGroup>
        </>
      )}
    </CardItemGroup>
  );
}

// ============================================================
// Main component
// ============================================================

export function SimpleEditorSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
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
        width: collapsed ? 52 : 300,
        transition: "width 0.2s ease",
      }}
    >
      {/* ── Workspace ── */}
      <WorkspaceHeader collapsed={collapsed} onToggle={onToggle} />

      <NavItems collapsed={collapsed} />

      <Separator orientation="horizontal" />

      {/* ── Pages ── */}
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
