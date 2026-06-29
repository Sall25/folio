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
  LayoutGrid,
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
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-location";
import { useEditorLayout } from "./context/editor-layout-context";
import { useSearch } from "./context/search-context";
import { PageItem } from "./page-item";
import { SidebarTree } from "./components/sidebar-tree";
import { usePageTree, useRecentPages } from "src/hooks/use-pages";
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

function User() {
  const { t } = useTranslation();
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
        {t("sidebar.personalSpace", { name: "Souleymane Sall" })}
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

function WorkSpaceFooter({ onCreatePage }: { onCreatePage?: () => void }) {
  const { t } = useTranslation();

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
          aria-label={t("actions.createPage")}
          variant="ghost"
          onClick={onCreatePage}
          style={{
            minHeight: 40,
            height: 40,
            padding: "10px 20px",
            // padding: "20px 20.5px",
            borderRadius: "100px",
            border: "1px solid var(--tt-border-color)",
            width: "100%",
          }}
        >
          <SquarePen className="tiptap-button-icon" />
          <span className="tiptap-button-text">{t("actions.createPage")}</span>
          <ShortcutBadge shortcutKeys="Ctrl+O" />
        </Button>
      </CardItemGroup>
    </CardFooter>
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

      {/* <ButtonGroup className="sidebar-nav-item" orientation="vertical">
        <Button
          variant="ghost"
          onClick={() => {
            onTemplatesGalleryOpenChange?.(true);
          }}
          style={{
            fontWeight: 400,
            color: "var(--tt-text-color)",
            minHeight: 32,
            height: 32,
          }}
          data-active-state={templatesGalleryOpen ? "on" : "off"}
        >
          <LayoutGrid size={32} className="tiptap-button-icon" />
          <Spacer orientation="horizontal" size={1} />
          {!collapsed && <span className="tiptap-button-text">Templates</span>}
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
      </ButtonGroup>

    
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
      </ButtonGroup> */}
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

// ── RecentSection: persisted limit + collapse ────────────────────────────────
const RECENT_LIMIT_OPTIONS = [5, 10, 20] as const;
function RecentSection({
  onMoveUp,
  onMoveDown,
}: {
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const { t } = useTranslation();
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
      label={t("sidebar.recents")}
      defaultCollapsed={false}
      persistKey="folio:recents:collapsed"
      menuLabel={t("recents.options")}
      menu={
        <>
          <SectionMenuLabel>{t("recents.show")}</SectionMenuLabel>
          {RECENT_LIMIT_OPTIONS.map((n) => (
            <SectionMenuItem
              key={n}
              label={t("recents.items", { count: n })}
              selected={limit === n}
              closeOnClick={false}
              onClick={() => setLimit(n)}
            />
          ))}
          <SectionMenuItem
            label={t("recents.allItems")}
            selected={limit === "all"}
            closeOnClick={false}
            onClick={() => setLimit("all")}
          />
          <SectionMenuSeparator />
          <SectionMenuItem
            icon={<ArrowUp size={14} />}
            label={t("actions.moveUp")}
            onClick={onMoveUp}
            disabled={!onMoveUp}
          />
          <SectionMenuItem
            icon={<ArrowDown size={14} />}
            label={t("actions.moveDown")}
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

function Templates({
  onOpenTemplatesGallery,
}: {
  onOpenTemplatesGallery?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Button
      variant="ghost"
      style={{ width: "100%", justifyContent: "flex-start" }}
      onClick={onOpenTemplatesGallery}
    >
      <LayoutGrid className="tiptap-button-icon" />
      <span className="tiptap-button-text">{t("sidebar.templates")}</span>
    </Button>
  );
}

// ── main component: lens + tree + mutation hooks ─────────────────────────────
export function SimpleEditorSidebar() {
  const { t } = useTranslation();
  const { collapsed, sidebarWidth } = useEditorLayout();
  const { tree, data: pages, isPending, isLoading } = usePageTree();
  const patchPage = usePatchPage(({ id, patch }) => updatePage(id, patch));
  const createPage = useCreatePage();
  const { setActivePageId, activePageId } = useActivePage();
  const { onOpenChange: onTemplatesGalleryOpenChange } = useTemplates();

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
                    title: t("page.newPage"),
                    parentId: null,
                    category,
                  });
                  createPage
                    .mutateAsync(p)
                    .then((page) => setActivePageId(page.id));
                }}
              />
              <Spacer orientation="vertical" size={10} />
              <Templates
                onOpenTemplatesGallery={() =>
                  onTemplatesGalleryOpenChange?.(true)
                }
              />
              <Spacer orientation="vertical" size={25} />
            </>
          ))}
      </CardBody>

      {/* <Separator orientation="horizontal" style={{ height: 0.5 }} /> */}
      {!collapsed && <WorkSpaceFooter onCreatePage={onCreatePage} />}
    </Card>
  );
}
