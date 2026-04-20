// simple-editor-sidebar.tsx
import type { Page } from "./types";
import {
  Search,
  Home,
  FileEdit,
  LayoutTemplate,
  ChevronsRight,
  ChevronsLeft,
  Info,
  ChevronDown,
  Settings,
  UserRoundSearch,
  FileText,
  Table,
  Shapes,
  SquarePen,
} from "lucide-react";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardBody,
  CardFooter,
  CardGroupLabel,
  CardHeader,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { AvatarDemo } from "src/components/tiptap-ui-primitive/avatar";

import "./simple-editor-sidebar.scss";
import { PageItem } from "./page-item";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";

// ============================================================
// Sub-components
// ============================================================
function UserSpace({ name }: { name: string }) {
  return (
    <Card>
      <CardHeader>
        <CardItemGroup orientation="horizontal">
          <CardItemGroup orientation="vertical">
            <CardGroupLabel>
              <AvatarDemo />
              <span>{name}</span>
            </CardGroupLabel>
            <CardGroupLabel>Free Plan - 1 member</CardGroupLabel>
            <CardItemGroup orientation="horizontal">
              <Button>
                <Settings className="tiptap-button-icon" />
                <span>Settings</span>
              </Button>
              <Button>
                <UserRoundSearch className="tiptap-button-icon" />
                <span>Invite members</span>
              </Button>
            </CardItemGroup>
          </CardItemGroup>
        </CardItemGroup>
      </CardHeader>
      <CardBody>
        <CardItemGroup orientation="vertical">
          <span>Create work account</span>
          <span>Add another account</span>
          <span>Log out</span>
          <span>Get Windows app</span>
        </CardItemGroup>
      </CardBody>
    </Card>
  );
}

function UserSpacePopover({ name }: { name: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" tooltip="Workspace">
          <ChevronDown className="tiptap-button-icon" />
        </Button>
      </PopoverTrigger>
      <PopoverContent style={{ zIndex: 999 }}>
        <UserSpace name={name} />
      </PopoverContent>
    </Popover>
  );
}

function User({ name }: { name: string }) {
  const [hide, setHide] = useState(true);

  return (
    <ButtonGroup
      orientation="horizontal"
      onMouseOver={() => setHide(false)}
      onMouseLeave={() => setHide(true)}
    >
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: 90,
          display: "inline-block",
        }}
      >
        {name}
      </span>
      <Spacer orientation="horizontal" />
      {!hide && <UserSpacePopover name={name} />}
    </ButtonGroup>
  );
}

function WorkSpaceOptions() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" tooltip="Options">
          <ChevronDown className="tiptap-button-icon" />
        </Button>
      </PopoverTrigger>
      <PopoverContent style={{ zIndex: 999 }}>
        <Card>
          <CardBody>
            <Button>
              <FileText className="tiptap-button-icon" />
              <span>Page</span>
            </Button>
            <Button>
              <Table className="tiptap-button-icon" />
              <span>Database</span>
            </Button>
          </CardBody>
          <CardFooter>
            <Button>
              <Shapes className="tiptap-button-icon" />
              <span>Templates</span>
            </Button>
          </CardFooter>
        </Card>
      </PopoverContent>
    </Popover>
  );
}

function CreatePageButton({
  onNewPageAsync,
}: {
  onNewPageAsync: () => Promise<void>;
}) {
  return (
    <Button
      variant="ghost"
      tooltip={"Add new page"}
      onClick={async () => {
        await onNewPageAsync();
      }}
    >
      <SquarePen className="tiptap-button-icon" />
    </Button>
  );
}

function WorkspaceHeader({
  collapsed,
  onToggle,
  onNewPageAsync,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onNewPageAsync: () => Promise<void>;
}) {
  const [, setHide] = useState(true);

  return (
    <CardHeader>
      <CardItemGroup
        orientation={collapsed ? "vertical" : "horizontal"}
        onMouseLeave={() => setHide(true)}
        onMouseOver={() => setHide(false)}
      >
        <AvatarDemo />
        {!collapsed && <User name="Souleymane Sall" />}

        {!collapsed && <CreatePageButton onNewPageAsync={onNewPageAsync} />}
        <Button
          variant="ghost"
          className="sidebar-collapse-btn"
          onClick={onToggle}
          tooltip={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? (
            <ChevronsRight size={14} className="tiptap-button-icon" />
          ) : (
            <ChevronsLeft size={14} className="tiptap-button-icon" />
          )}
        </Button>

        {!collapsed && <WorkSpaceOptions />}
      </CardItemGroup>
    </CardHeader>
  );
}

function NavItems({ collapsed }: { collapsed: boolean }) {
  return (
    <ButtonGroup className="sidebar-nav">
      <Button variant="ghost" className="sidebar-nav-item" title="Home">
        <Search className="tiptap-button-icon" size={20} />
        {!collapsed && <span>Search</span>}
      </Button>
      <Button variant="ghost" className="sidebar-nav-item" title="Home">
        <Home className="tiptap-button-icon" size={16} />
        {!collapsed && <span>Home</span>}
      </Button>
      <Button variant="ghost" className="sidebar-nav-item" title="Drafts">
        <FileEdit className="tiptap-button-icon" size={16} />
        {!collapsed && <span>Drafts</span>}
      </Button>
      <Button variant="ghost" className="sidebar-nav-item" title="Templates">
        <LayoutTemplate className="tiptap-button-icon" size={16} />
        {!collapsed && <span>Templates</span>}
      </Button>
    </ButtonGroup>
  );
}

// ============================================================
// Main component
// ============================================================

export function SimpleEditorSidebar({
  pages,
  activePage,
  // query,
  // onSearch,
  onSelectAsync,
  onDeleteAsync,
  onAddPageAsync,
  onNewPageAsync,
  onRenameAsync,
  collapsed,
  onToggle,
}: {
  pages: Page[];
  activePage: Page | null;
  query: string;
  onSearchAsync: (q: string) => Promise<void>;
  onSelectAsync: (page: Page) => Promise<void>;
  onDeleteAsync: (id: string) => Promise<void>;
  onAddPageAsync: (title: string, parentId: string) => Promise<void>;
  onNewPageAsync: () => Promise<void>;
  onRenameAsync: (id: string, title: string) => Promise<void>;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <Card
      className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}
      style={{
        zIndex: 120,
        position: "fixed",
        left: 0,
        borderRadius: 0,
        boxShadow: "none",
        width: collapsed ? 52 : 240,
        transition: "width 0.2s ease",
      }}
    >
      {/* ── Workspace ── */}
      <WorkspaceHeader
        onNewPageAsync={onNewPageAsync}
        collapsed={collapsed}
        onToggle={onToggle}
      />

      <NavItems collapsed={collapsed} />

      <Separator orientation="horizontal" />

      {/* ── Pages ── */}
      {!collapsed && (
        <CardBody className="sidebar-pages">
          <CardGroupLabel>Pages</CardGroupLabel>

          {pages.length === 0 && <p className="sidebar-empty">No pages yet.</p>}

          <CardItemGroup style={{ gap: 5 }}>
            {pages.map((page) => (
              <PageItem
                key={page.id}
                page={page}
                activePage={activePage}
                onSelectAsync={onSelectAsync}
                onDeleteAsync={onDeleteAsync}
                onAddPageAsync={onAddPageAsync}
                onRenameAsync={onRenameAsync}
              />
            ))}
          </CardItemGroup>
        </CardBody>
      )}

      <Separator orientation="horizontal" />
      <CardFooter style={{ width: "100%" }}>
        <Button
          variant="ghost"
          style={{
            justifyContent: "flex-start",
            alignItems: "flex-start",
          }}
        >
          <Info className="tiptap-button-icon" />
        </Button>
      </CardFooter>
    </Card>
  );
}
