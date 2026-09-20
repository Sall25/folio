import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEditorLayout } from "../../context/editor-layout-context";
import { useLayoutMode } from "../../hooks/use-layout-mode";
import { usePageTree, useRecentPages } from "src/hooks/use-pages";
import { useTeamspaces } from "src/hooks/use-teamspaces";
import { useGroups } from "src/hooks/use-groups";
import { usePatchPage } from "src/hooks/use-patch-page";
import { useCreatePage } from "src/hooks/use-create-page";
import { useActivePageActions } from "../../context/active-page-context";
import { useCurrentPerson } from "src/hooks/use-session";
import { useSectionOrder } from "../../hooks/use-sidebar-order";
import { useHiddenSections } from "../../hooks/use-hidden-sections";
import type { Group, ID, PageCategory, Teamspace } from "src/types";
import { makePage } from "src/utils/make-page";
import { patchPage as updatePage } from "src/api/pages";
import { Card, CardBody } from "src/components/tiptap-ui-primitive/card";
import { ScrollFog } from "src/components/tiptap-ui-primitive/scroll-frog";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { SidebarTree } from "../sidebar-tree";
import { LibraryPaletteTrigger } from "./library-palette-trigger";
import { TemplatePaletteTrigger } from "./template-palette-trigger";
import { CustomizeSidebarPanel } from "../customize-sidebar-panel";
import { CreateTeamspaceModal } from "../create-teamspace-modal";
import { useIsMobile } from "src/hooks/use-breakpoint";
import { useNavigate } from "@tanstack/react-location";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Trash2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { TrashPanel } from "../trash-panel";
import { Separator } from "src/components/tiptap-ui-primitive/separator";

// Stable references so a memoized <SidebarTree /> can skip re-render when the
// pages cache churns but nothing it renders actually changed.
const NOOP = () => {};
const EMPTY_TEAMSPACES: Teamspace[] = [];
const EMPTY_GROUPS: Group[] = [];

function Trash() {
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { onCollapsedChange } = useEditorLayout();

  const handleTrashClick = () => {
    if (isMobile) {
      navigate({ to: "/trash" });
      onCollapsedChange(isMobile);
    }
  };

  if (isMobile) {
    return (
      <Button
        variant="ghost"
        size="large"
        style={{ width: "100%", justifyContent: "flex-start" }}
        onClick={handleTrashClick}
      >
        <Trash2 className="tiptap-button-icon" />
        <Spacer orientation="horizontal" size={2} />
        <span
          className="tiptap-button-text"
          style={{ opacity: 1, display: "block" }}
        >
          {t("sidebar.trash")}
        </span>
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="large"
          style={{ width: "100%", justifyContent: "flex-start" }}
        >
          <Trash2 className="tiptap-button-icon" />
          <Spacer orientation="horizontal" size={2} />
          <span
            className="tiptap-button-text"
            style={{ opacity: 1, display: "block" }}
          >
            {t("sidebar.trash")}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverPortal container={document.getElementById("root")}>
        <PopoverContent
          side="right"
          alignOffset={6}
          collisionPadding={8}
          align="center"
          avoidCollisions
          style={{ zIndex: 999 }}
        >
          <Card style={{ minWidth: 300, minHeight: 300 }}>
            <TrashPanel />
          </Card>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
}

export const SidebarBody = memo(() => {
  const { t } = useTranslation();
  const {
    collapsed,
    peeking,
    peekPhase: phase,
    customizeSidebarOpen,
    setCustomizeSidebarOpen,
  } = useEditorLayout();
  const { isMobile } = useLayoutMode();

  const { tree, isPending, isLoading } = usePageTree();
  // Joined to teamspace-pages by id, only to show a member count in the row.
  const { data: teamspaces = EMPTY_TEAMSPACES } = useTeamspaces();
  const { data: groups = EMPTY_GROUPS } = useGroups();
  const patchPage = usePatchPage(({ id, patch }) => updatePage(id, patch));
  const createPage = useCreatePage();
  const { setActivePageId } = useActivePageActions();
  const [createTeamspaceOpen, setCreateTeamspaceOpen] = useState(false);
  const { person } = useCurrentPerson();

  const isFloating = !isMobile && collapsed && peeking;

  const [, setPeekEntered] = useState(false);

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
  const [, setFloatingMounted] = useState(false);

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

  const floatingActive = !isMobile && collapsed && phase !== "hidden";
  // Visible position: on-screen while open OR during the grace period of leaving.
  // Only 'hidden' (after the timer) actually moves it off.
  const showContent = isMobile ? true : !collapsed || floatingActive;

  const { data: recentPages } = useRecentPages(6);

  const treeWithRecent = useMemo(
    () => ({
      ...tree,
      Recent: (recentPages ?? []).map((page) => ({
        page,
        children: [],
      })),
    }),
    [tree, recentPages],
  );

  const [order] = useSectionOrder();
  const [hidden, toggleHidden] = useHiddenSections();

  const handleMovePage = useCallback(
    ({
      pageId,
      newParentId,
      category,
    }: {
      pageId: ID;
      newParentId: ID | null;
      category?: PageCategory;
    }) => {
      // optimistic move — patch parentId (+ category on cross-section drop)
      patchPage.mutate({
        id: pageId,
        patch: {
          parentId: newParentId,
          ...(category ? { category } : {}),
        },
      });
    },
    [patchPage],
  );

  const handleAddPageToSection = useCallback(
    (category: PageCategory) => {
      if (!person) return null;
      // A teamspace is created through its own modal (it must create a page +
      // a Teamspace record sharing one id), not as a plain page. Every other
      // section creates a page directly.
      if (category === "Teamspaces") {
        setCreateTeamspaceOpen(true);
        return;
      }
      const p = makePage({
        title: t("page.newPage"),
        parentId: null,
        category,
        ownerId: person.id,
      });
      createPage.mutateAsync(p).then((page) => setActivePageId(page.id));
    },
    [person, t, createPage, setActivePageId, setCreateTeamspaceOpen],
  );

  return (
    <>
      {showContent && !customizeSidebarOpen && (
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
                <Spacer orientation="vertical" size={12} />
              </>
            )}

            <div style={{ display: "contents" }}>
              <SidebarTree
                key={"sidebar-tree"}
                tree={treeWithRecent}
                teamspaces={teamspaces as Teamspace[]}
                groups={groups as Group[]}
                onMovePage={handleMovePage}
                onAddPageToSection={handleAddPageToSection}
                onRenameSection={NOOP}
                onDeleteSection={NOOP}
                isLoading={isPending || isLoading}
              />
            </div>

            {!peeking && (
              <>
                <Spacer orientation="vertical" size={10} />
                <Separator orientation="horizontal" style={{ height: 0.5 }} />
                <Spacer orientation="vertical" size={10} />
                <LibraryPaletteTrigger />
                <Spacer orientation="vertical" size={5} />
                <TemplatePaletteTrigger />
                <Spacer orientation="vertical" size={5} />
                <Trash />

                <Spacer orientation="vertical" size={25} />
              </>
            )}
          </>
        </CardBody>
      )}
      {customizeSidebarOpen && (
        <CustomizeSidebarPanel
          order={order}
          hidden={hidden}
          onToggle={toggleHidden}
          onDone={() => setCustomizeSidebarOpen?.(false)}
        />
      )}

      {/* <WorkspaceFooter /> */}

      {createTeamspaceOpen && (
        <CreateTeamspaceModal
          onClose={() => setCreateTeamspaceOpen(false)}
          onCreated={(pageId) => setActivePageId(pageId)}
        />
      )}
    </>
  );
});
