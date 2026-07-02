import {
  Search,
  Home,
  Inbox,
  Store,
  LibraryBig,
  Sparkles,
  PanelLeft,
  PanelRight,
  //  SquarePen,
  //  LayoutTemplate,
  Settings,
  LayoutTemplate,
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
import { useCallback, useState } from "react";
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
import { SidebarBodySkeleton } from "./components/skeletons";
import { useActivePage } from "./context/active-page-context";
import { Section } from "./components/section";
import { ScrollFog } from "src/components/tiptap-ui-primitive/scroll-frog";
import { useWorkspaceSettings as useWorkspaceSettingsModal } from "./context/workspace-settings-context";
import { CreateTeamspaceModal } from "./components/create-teamspace-modal";
import type { Group, Teamspace } from "src/types";
import { useCurrentPerson } from "src/hooks/use-session";
import { useTemplates } from "./context/templates-context";
import { SidebarResizeHandle } from "./components/sidebar-resize-handle";

function User() {
  const { t } = useTranslation();
  const { collapsed, onCollapsedChange } = useEditorLayout();
  const { person } = useCurrentPerson();

  const onToggle = useCallback(
    () => onCollapsedChange(!collapsed),
    [onCollapsedChange, collapsed],
  );

  const name = person?.name ?? "";
  const initial = name ? name.charAt(0).toUpperCase() : "?";

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
        }}
      >
        {t("sidebar.personalSpace", { name })}
      </span>
      <Spacer orientation="horizontal" />

      <Button
        variant="ghost"
        tooltip={t("sidebar.collapse")}
        onClick={onToggle}
      >
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
  const { t } = useTranslation();
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
          tooltip={t("sidebar.expand")}
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

// function WorkSpaceFooter({ onCreatePage }: { onCreatePage?: () => void }) {
//   const { t } = useTranslation();

//   return (
//     <CardFooter
//       style={{
//         position: "sticky",
//         bottom: 0,
//         zIndex: 5,
//         minHeight: 50,
//         display: "flex",
//         justifyContent: "flex-start",
//         alignItems: "center",
//         width: "100%",
//         padding: "0 15px",
//         borderTop: "0.5px solid var(--tt-border-color)",
//         // translucent sidebar bg + blur = the frost. Opaque bg kills the effect.
//         background:
//           "color-mix(in srgb, var(--sidebar-bg-color) 70%, transparent)",
//         backdropFilter: "blur(12px) saturate(1.4)",
//         WebkitBackdropFilter: "blur(12px) saturate(1.4)",
//       }}
//     >
//       {/* the fog: fades scrolling list into the sidebar bg, just above the bar */}
//       <div
//         aria-hidden
//         style={{
//           position: "absolute",
//           left: 0,
//           right: 0,
//           bottom: "100%",
//           height: 36,
//           pointerEvents: "none",
//           background:
//             "linear-gradient(to top, var(--sidebar-bg-color), transparent)",
//         }}
//       />

//       <CardItemGroup
//         orientation="horizontal"
//         style={{
//           width: "100%",
//           justifyContent: "center",
//           alignItems: "center",
//           marginBottom: 5,
//           gap: 10,
//         }}
//       >
//         <Button
//           aria-label={t("actions.createPage")}
//           // variant="ghost"
//           onClick={onCreatePage}
//           style={{
//             minHeight: 40,
//             height: 50,
//             padding: "10px 20px",
//             // padding: "20px 20.5px",
//             borderRadius: "100px",
//             border: "1px solid var(--tt-border-color)",
//             width: "20%",
//           }}
//         >
//           <SquarePen className="tiptap-button-icon" />
//         </Button>
//       </CardItemGroup>
//     </CardFooter>
//   );
// }

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
      variant="ghost"
      onClick={() => onOpenChange?.(true)}
      style={{ width: "100%", justifyContent: "flex-start" }}
    >
      <LayoutTemplate className="tiptap-button-icon" />
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
      onClick={handleLibraryClick}
      variant="ghost"
      style={{ width: "100%", justifyContent: "flex-start" }}
    >
      <LibraryBig className="tiptap-button-icon" />
      <span>Library</span>
    </Button>
  );
}
// ── main component: lens + tree + mutation hooks ─────────────────────────────
export function SimpleEditorSidebar() {
  const { t } = useTranslation();
  const { collapsed, sidebarWidth, isResizingSidebar } = useEditorLayout();
  const { tree, data: pages, isPending, isLoading } = usePageTree();
  // Joined to teamspace-pages by id, only to show a member count in the row.
  const { data: teamspaces = [] } = useTeamspaces();
  const { data: groups = [] } = useGroups();
  const patchPage = usePatchPage(({ id, patch }) => updatePage(id, patch));
  const createPage = useCreatePage();
  const { setActivePageId /*, activePageId*/ } = useActivePage();
  //  const { onOpenChange: onTemplatesGalleryOpenChange } = useTemplates();
  const { openTo } = useWorkspaceSettingsModal();
  const [createTeamspaceOpen, setCreateTeamspaceOpen] = useState(false);

  // const onCreatePage = () => {
  //   const newPage = makePage({
  //     title: t("page.newPage"),
  //     parentId: null,
  //     category: "Private",
  //   });

  //   createPage
  //     .mutateAsync(newPage)
  //     .then((newPage) => setActivePageId(newPage.id))
  //     .catch(() => {
  //       if (activePageId) {
  //         setActivePageId(activePageId);
  //       }
  //       console.log("failed to create new page");
  //     });
  // };

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
        ["--sidebar-width" as string]: `${sidebarWidth}px`,
        transition: isResizingSidebar ? "none" : "width 0.2s ease",
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
              <ScrollFog edge="top" color="var(--sidebar-fog-color)" />
              <Spacer orientation="vertical" size={15} />

              <ShowcaseSection />
              <Spacer orientation="vertical" size={15} />

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
              />

              <Spacer orientation="vertical" size={12} />
              <Button
                variant="ghost"
                onClick={() => openTo("teamspaces")}
                aria-label="Open workspace settings"
                style={{
                  justifyContent: "flex-start",
                  width: "100%",
                  gap: 8,
                  color: "var(--tt-text-color)",
                }}
              >
                <Settings className="tiptap-button-icon" size={16} />
                <span className="tiptap-button-text">Workspace settings</span>
              </Button>
              <Spacer orientation="vertical" size={4} />
              <TemplatesModalTrigger />
              <Spacer orientation="vertical" size={4} />
              <LibraryPaletteTrigger />
              <Spacer orientation="vertical" size={25} />
            </>
          ))}
      </CardBody>

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
}
