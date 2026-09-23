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
import type {
  Group,
  ID,
  Page,
  PageCategory,
  PageTreeNode,
  Teamspace,
} from "src/types";
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
import { useCurrentWorkspace } from "src/hooks/use-workspaces";
import { useCurrentSpace } from "src/hooks/use-current-space";
import { useTeamspacePins } from "src/hooks/use-teamspace-pins";
import {
  TeamspacePinContext,
  type TeamspacePinControl,
} from "../../context/teamspace-pin-context";

const NOOP = () => {};
const EMPTY_TEAMSPACES: Teamspace[] = [];
const EMPTY_GROUPS: Group[] = [];
const RECENT_LIMIT = 6;

// Inside a teamspace: Pinned (the Favorites key, relabelled — Favorites is a
// workspace concept, so the key is free here), Recent, Pages (its root,
// flattened), Templates. Pinned and Templates are flat lists.
const TEAMSPACE_SECTIONS: PageCategory[] = [
  "Favorites",
  "Recent",
  "Teamspaces",
  "Template",
];
const TEAMSPACE_FLATTEN: PageCategory[] = ["Teamspaces"];
const TEAMSPACE_FLAT: PageCategory[] = ["Favorites", "Template"];
// Every member can reorganize inside a teamspace (pages_update already
// allows teamspace members server-side).
const ALLOW_ALL = () => true;

const toLeaf = (page: Page): PageTreeNode => ({ page, children: [] });

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
  const { data: teamspaces = EMPTY_TEAMSPACES } = useTeamspaces();
  const { data: groups = EMPTY_GROUPS } = useGroups();
  const patchPage = usePatchPage(({ id, patch }) => updatePage(id, patch));
  const createPage = useCreatePage();
  const { setActivePageId } = useActivePageActions();
  const [createTeamspaceOpen, setCreateTeamspaceOpen] = useState(false);
  const { person } = useCurrentPerson();
  const space = useCurrentSpace();
  const teamspaceId = space.kind === "teamspace" ? space.id : null;
  const teamspaceHostWs =
    space.kind === "teamspace" ? (space.page?.workspaceId ?? null) : null;
  const { pinnedIds, canPin, isPinned, setPinned } =
    useTeamspacePins(teamspaceId);

  // Pin controls for the rows: computed once here, read by each PageItem
  // through context (no per-row query subscriptions). Null unless you own
  // the teamspace you're in.
  const pinControl = useMemo<TeamspacePinControl | null>(
    () => (teamspaceId && canPin ? { teamspaceId, isPinned, setPinned } : null),
    [teamspaceId, canPin, isPinned, setPinned],
  );

  const isFloating = !isMobile && collapsed && peeking;

  const [, setPeekEntered] = useState(false);

  useEffect(() => {
    if (isFloating) {
      const raf = requestAnimationFrame(() => setPeekEntered(true));
      return () => cancelAnimationFrame(raf);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPeekEntered(false);
  }, [isFloating]);

  const [, setFloatingMounted] = useState(false);

  useEffect(() => {
    if (isFloating) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFloatingMounted(true);
      const raf = requestAnimationFrame(() => setPeekEntered(true));
      return () => cancelAnimationFrame(raf);
    }
    setPeekEntered(false);
    const t = window.setTimeout(() => setFloatingMounted(false), 260);
    return () => window.clearTimeout(t);
  }, [isFloating]);

  const floatingActive = !isMobile && collapsed && phase !== "hidden";
  const showContent = isMobile ? true : !collapsed || floatingActive;

  // Unlimited (all non-deleted pages, newest first) — scoped + capped below.
  const { data: allRecentPages } = useRecentPages();

  const sidebarTree = useMemo<Record<PageCategory, PageTreeNode[]>>(() => {
    const result = {} as Record<PageCategory, PageTreeNode[]>;
    const all = allRecentPages ?? [];

    if (teamspaceId) {
      const byId = new Map(all.map((p) => [p.id, p]));
      const root = (tree.Teamspaces ?? []).find(
        (n) => n.page.id === teamspaceId,
      );
      // Key order matters: flat sections first, the tree last, so a pinned
      // page resolves to its tree node for drag math.
      result.Favorites = pinnedIds
        .map((id) => byId.get(id))
        .filter((p): p is Page => p != null)
        .map(toLeaf);
      result.Recent = all
        .filter(
          (p) =>
            p.teamspaceId === teamspaceId &&
            p.id !== teamspaceId &&
            p.category !== "Template",
        )
        .slice(0, RECENT_LIMIT)
        .map(toLeaf);
      result.Template = all
        .filter(
          (p) => p.category === "Template" && p.teamspaceId === teamspaceId,
        )
        .map(toLeaf);
      result.Teamspaces = root ? [root] : [];
      return result;
    }

    Object.assign(result, tree);
    result.Recent = all.slice(0, RECENT_LIMIT).map(toLeaf);
    return result;
  }, [tree, allRecentPages, teamspaceId, pinnedIds]);

  const teamspaceLabels = useMemo(
    () => ({
      Favorites: t("sidebar.pinned", "Pinned"),
      Teamspaces: t("sidebar.pages", "Pages"),
      Template: t("sidebar.templates", "Templates"),
    }),
    [t],
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

  const { workspaceId } = useCurrentWorkspace();
  const handleAddPageToSection = useCallback(
    (category: PageCategory) => {
      if (!person || !workspaceId) return null;

      if (teamspaceId) {
        const hostWs = teamspaceHostWs ?? workspaceId;
        // Templates are ROOT pages carrying the teamspace id (the server
        // accepts it for members); everything else is a child of the root.
        const p =
          category === "Template"
            ? makePage({
                title: t("templates.newTemplate"),
                parentId: null,
                category: "Template",
                ownerId: person.id,
                workspaceId: hostWs,
                teamspaceId,
              })
            : makePage({
                title: t("page.newPage"),
                parentId: teamspaceId,
                category: "Teamspaces",
                ownerId: person.id,
                workspaceId: hostWs,
                teamspaceId,
              });
        createPage.mutateAsync(p).then((page) => setActivePageId(page.id));
        return;
      }

      if (category === "Teamspaces") {
        setCreateTeamspaceOpen(true);
        return;
      }
      const p = makePage({
        title: t("page.newPage"),
        parentId: null,
        category,
        ownerId: person.id,
        workspaceId,
      });
      createPage.mutateAsync(p).then((page) => setActivePageId(page.id));
    },
    [
      person,
      t,
      createPage,
      setActivePageId,
      setCreateTeamspaceOpen,
      workspaceId,
      teamspaceId,
      teamspaceHostWs,
    ],
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
              <TeamspacePinContext.Provider value={pinControl}>
                <SidebarTree
                  key={teamspaceId ?? "workspace"}
                  tree={sidebarTree}
                  teamspaces={teamspaces as Teamspace[]}
                  groups={groups as Group[]}
                  onMovePage={handleMovePage}
                  onAddPageToSection={handleAddPageToSection}
                  onRenameSection={NOOP}
                  onDeleteSection={NOOP}
                  isLoading={isPending || isLoading}
                  sections={teamspaceId ? TEAMSPACE_SECTIONS : undefined}
                  sectionLabels={teamspaceId ? teamspaceLabels : undefined}
                  flattenRootsOf={teamspaceId ? TEAMSPACE_FLATTEN : undefined}
                  flatSections={teamspaceId ? TEAMSPACE_FLAT : undefined}
                  canReorganize={teamspaceId ? ALLOW_ALL : undefined}
                />
              </TeamspacePinContext.Provider>
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

      {createTeamspaceOpen && (
        <CreateTeamspaceModal
          onClose={() => setCreateTeamspaceOpen(false)}
          onCreated={(pageId) => setActivePageId(pageId)}
        />
      )}
    </>
  );
});
