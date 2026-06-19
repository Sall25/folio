import {
  Search,
  Home,
  Inbox,
  Store,
  LibraryBig,
  ChevronsLeft,
  ChevronsRight,
  Plus,
} from "lucide-react";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Separator } from "src/components/tiptap-ui-primitive/separator";

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
          minWidth: 24,
          width: 24,
          minHeight: 24,
          height: 24,
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

      {collapsed && (
        <Button
          variant="ghost"
          onClick={onToggle}
          tooltip={"Expand"}
          style={{ justifyContent: "flex-start" }}
        >
          <ChevronsRight className="tiptap-button-icon" />
        </Button>
      )}
    </CardItemGroup>
  );
}

function WorkSpaceFooter() {
  return (
    <CardFooter
      style={{
        minHeight: 50,
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "center",
        width: "100%",
        padding: "0 15px",
      }}
    >
      <CardItemGroup
        orientation="horizontal"
        style={{
          width: "100%",
          justifyContent: "flex-start",
          marginBottom: 5,
          gap: 5,
        }}
      >
        <Button
          //variant="ghost"
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

// ── RecentSection: just use the lens ─────────────────────────────────────────
function RecentSection() {
  const { data: recentPages } = useRecentPages(8); // the lens, with the null-fallback baked in
  const createPage = useCreatePage();

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

  return (
    <CardItemGroup className="sidebar-section" orientation="vertical">
      {recentPages.length > 0 && (
        <>
          <span className="sidebar-section__label">Recents</span>
          <Spacer orientation="vertical" size={5} />
          <CardItemGroup style={{ gap: 2 }}>
            {recentPages.map((page) => (
              <PageItem key={page.id} page={page} />
            ))}
          </CardItemGroup>
        </>
      )}
      <Spacer orientation="vertical" size={5} />
      <Button
        variant="ghost"
        style={{
          justifyContent: "flex-start",
          borderRadius: "var(--tt-radius-sm)",
          fontSize: 12,
          lineHeight: 1.3,
        }}
        onClick={handleNewPage}
      >
        <Plus className="tiptap-button-icon" />
        <span className="tiptap-button-text">New Page</span>
      </Button>
    </CardItemGroup>
  );
}

// ── main component: lens + tree + mutation hooks ─────────────────────────────
export function SimpleEditorSidebar() {
  const { collapsed, sidebarWidth } = useEditorLayout();
  const { tree, data: pages, isPending } = usePageTree();
  const patchPage = usePatchPage(({ id, patch }) => updatePage(id, patch));
  const createPage = useCreatePage();

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
      <CardHeader /* ... */>
        <CardItemGroup orientation="vertical" style={{ width: "100%" }}>
          <WorkspaceHeader />
          <Spacer orientation="vertical" size={4} />
          <NavItems />
        </CardItemGroup>
      </CardHeader>

      <CardBody style={{ width: "100%", padding: "0 10px" }}>
        <Spacer orientation="vertical" size={20} />
        {pages.length > 0 && !collapsed && <RecentSection />}
        <Spacer orientation="vertical" size={10} />

        {!collapsed && (
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
              createPage.mutate(p); // one optimistic create, category seeded
            }}
            onRenameSection={() => {}}
            onDeleteSection={() => {}}
            onAddSection={() => {}}
          />
        )}
      </CardBody>
      <Separator orientation="horizontal" style={{ height: 0.5 }} />
      <WorkSpaceFooter />
    </Card>
  );
}

// export function SimpleEditorSidebar() {
//   const { collapsed, sidebarWidth } = useEditorLayout();
//   const { pages } = useActivePage();
//   // addPageAsync is already used by the header; updatePageAsync persists the
//   // category change on a cross-section drop. Point these at your real
//   // mutations if they live under a different hook/name.
//   const { addPageAsync, updatePageAsync } = usePages();

//   if (!pages) return null;

//   return (
//     <Card
//       className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}
//       style={{
//         zIndex: 120,
//         position: "fixed",
//         left: 0,
//         borderRadius: 0,
//         width: sidebarWidth,
//         // boxShadow: "none",
//         //width: collapsed ? 52 : 290,
//         transition: "width 0.2s ease",
//         height: "100vh",
//         overflow: "hidden",
//         display: "flex",
//         flexDirection: "column",
//       }}
//     >
//       <CardHeader
//         style={{
//           padding: !collapsed ? "5px 10px" : 0,
//           width: "100%",
//         }}
//       >
//         <CardItemGroup orientation="vertical" style={{ width: "100%" }}>
//           <WorkspaceHeader />
//           <Spacer orientation="vertical" size={4} />
//           <NavItems />
//         </CardItemGroup>
//       </CardHeader>

//       <CardBody style={{ width: "100%", padding: "0 10px" }}>
//         <Spacer orientation="vertical" size={20} />
//         {pages.length > 0 && !collapsed && <RecentSection pages={pages} />}
//         <Spacer orientation="vertical" size={10} />

//         {!collapsed && (
//           <SidebarTree
//             pages={pages}
//             onMovePage={({ pageId, newParentId, category }) => {
//               const page = findPage(pages, pageId);
//               if (!page) return;
//               updatePageAsync({
//                 ...page,
//                 parentId: newParentId,
//                 ...(category ? { category } : {}),
//               });
//             }}
//             onAddPageToSection={async (category) => {
//               const p = await addPageAsync({
//                 title: "New Page",
//                 parentId: null,
//               });
//               if (p?.id != null) await updatePageAsync({ ...p, category });
//             }}
//             onRenameSection={() => {
//               // TODO: open rename dialog
//             }}
//             onDeleteSection={() => {
//               // TODO: confirm + delete
//             }}
//             onAddSection={() => {
//               // TODO: add-section dialog
//             }}
//           />
//         )}
//       </CardBody>
//       <Separator orientation="horizontal" style={{ height: 0.5 }} />
//       <WorkSpaceFooter />
//     </Card>
//   );
// }
