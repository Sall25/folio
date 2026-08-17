import {
  useState,
  useMemo,
  useCallback,
  memo,
  type CSSProperties,
  type ReactNode,
  useEffect,
} from "react";
import { Pencil, Trash2, EyeOff, Layout } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
  PageCategory,
  PageTreeNode,
  ID,
  Teamspace,
  Group,
} from "src/types";
import { effectiveMemberCount } from "src/types";
import { PageItem } from "../page-item";
import "./sidebar-sections.scss";
import "./sidebar-tree.scss";
import {
  Section,
  SectionMenuItem,
  SectionMenuLabel,
  SectionMenuSeparator,
} from "./section";
import { useLibrary } from "../context/library-context";
import { useTranslation } from "react-i18next";
import {
  applySectionSort,
  buildCategoryByPageId,
  DEFAULT_SECTION_ORDER,
  getSortMode,
  reorderScope,
  scopeKeyForChildren,
  scopeKeyForRoots,
  useCustomOrder,
  useSectionOrder,
  useSectionSortModes,
  type SortMode,
} from "../hooks/use-sidebar-order";
import { PageRowSkeleton } from "./skeletons";
import { useCurrentPerson } from "src/hooks/use-session";
import { useActivePageState } from "../context/active-page-context";
import { usePageCapabilities } from "src/hooks/use-page-role";
import { useHiddenSections } from "../hooks/use-hidden-sections";
import { useEditorLayoutActions } from "../context/editor-layout-context";

type DropZone = "before" | "after" | "inside";

type DropTarget =
  | { kind: "page"; pageId: ID; zone: DropZone }
  | { kind: "section"; category: PageCategory }
  | null;

const SECTION_DRAG_PREFIX = "section-drag:";

const isSectionId = (id: string | number) =>
  typeof id === "string" &&
  (id.startsWith("section:") || id.startsWith("section-header:"));

const treeCollisionDetection: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  const collisions = pointer.length ? pointer : rectIntersection(args);
  const pageHit = collisions.find((c) => !isSectionId(c.id));
  return pageHit ? [pageHit] : collisions;
};

export interface SidebarTreeProps {
  tree: Record<PageCategory, PageTreeNode[]>;
  /** Teamspace records, joined to teamspace-pages by id to show a member count. */
  teamspaces: Teamspace[];
  groups: Group[];
  onMovePage: (args: {
    pageId: ID;
    newParentId: ID | null;
    category?: PageCategory;
  }) => void;
  onAddPageToSection?: (category: PageCategory) => void;
  onRenameSection?: (category: PageCategory) => void;
  onDeleteSection?: (category: PageCategory) => void;
  onHideSection?: (category: PageCategory) => void;
  isLoading?: boolean;
}

function collectSubtreeIds(
  node: PageTreeNode,
  acc: Set<ID> = new Set(),
): Set<ID> {
  acc.add(node.page.id);
  for (const c of node.children) collectSubtreeIds(c, acc);
  return acc;
}

// ── Recursive tree row ─────────────────────────────────────────────────────
function TreeRow({
  node,
  depth,
  expandedIds,
  onToggleExpand,
  dropTarget,
  activeId,
  subtitleByPageId,
  canEditContent,
}: {
  node: PageTreeNode;
  depth: number;
  expandedIds: Set<ID>;
  onToggleExpand: (id: ID) => void;
  dropTarget: DropTarget;
  activeId: ID | null;
  subtitleByPageId: Map<ID, string>;
  canEditContent: boolean;
}) {
  const page = node.page;
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(page.id);
  const { person } = useCurrentPerson();
  const isOwner = person?.id != null && page.ownerId === person.id;

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
  } = useDraggable({ id: page.id, disabled: !isOwner });
  const { setNodeRef: setDropRef } = useDroppable({ id: page.id });

  const setRefs = useCallback(
    (el: HTMLElement | null) => {
      setDragRef(el);
      setDropRef(el);
    },
    [setDragRef, setDropRef],
  );

  const isDragging = activeId === page.id;

  const zone =
    dropTarget?.kind === "page" && dropTarget.pageId === page.id
      ? dropTarget.zone
      : null;

  const rowStyle: CSSProperties = {
    paddingLeft: depth * 14,
    opacity: isDragging ? 0.3 : 1,
    position: "relative",
  };

  return (
    <>
      <div
        ref={setRefs}
        className={[
          "sidebar-tree__row",
          hasChildren && "sidebar-tree__row--has-children",
          zone === "inside" && "sidebar-tree__row--nest",
        ]
          .filter(Boolean)
          .join(" ")}
        style={rowStyle}
        {...attributes}
        {...listeners}
      >
        {zone === "before" && (
          <div className="sidebar-tree__line sidebar-tree__line--top" />
        )}
        {zone === "after" && (
          <div className="sidebar-tree__line sidebar-tree__line--bottom" />
        )}

        <div className="sidebar-tree__item">
          <PageItem
            page={page}
            depth={0}
            subtitle={subtitleByPageId.get(page.id)}
            expanded={isExpanded}
            onToggleExpand={onToggleExpand}
            canEditContent={canEditContent}
          />
        </div>
      </div>

      {isExpanded && (
        <div className="sidebar-tree__children">
          {hasChildren ? (
            node.children.map((child) => (
              <TreeRow
                key={child.page.id}
                node={child}
                depth={depth + 1}
                expandedIds={expandedIds}
                onToggleExpand={onToggleExpand}
                dropTarget={dropTarget}
                activeId={activeId}
                subtitleByPageId={subtitleByPageId}
                canEditContent={canEditContent}
              />
            ))
          ) : (
            <div
              className="sidebar-tree__empty-leaf"
              style={{
                paddingLeft: (depth + 1) * 14 + 6,
                paddingTop: 3,
                paddingBottom: 3,
                fontSize: 12.5,
                color:
                  "color-mix(in srgb, var(--tt-text-primary) 42%, transparent)",
                userSelect: "none",
              }}
            >
              No pages inside
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── TreeSection: wires dnd-kit droppables into the reusable Section ──────────
// The reusable Section is dnd-agnostic; this wrapper owns the droppables and
// passes their refs + active state down. Header/body droppable ids are
// unchanged, so collision detection and onDragOver/End keep working as-is.
/**
 * "Favorites" | "Shared" | "Private" | "Template" | "Teamspaces"
 */
const CATEGORY_TRANSLATION_MAP: Record<PageCategory, string> = {
  Recent: "section.recent",
  Favorites: "section.favorites",
  Shared: "section.shared",
  Private: "section.private",
  Teamspaces: "section.teamspaces",
  Template: "section.template",
};

function TreeSection({
  category,
  topLevel,
  expandedIds,
  onToggleExpand,
  dropTarget,
  activeId,
  collapsed,
  onToggleCollapse,
  onAddPage,
  onRename,
  onDelete,
  onHide,
  subtitleByPageId,
  sortMode,
  onSetSortMode,
  isLoading,
  canEditContent,
}: {
  category: PageCategory;
  topLevel: PageTreeNode[];
  expandedIds: Set<ID>;
  onToggleExpand: (id: ID) => void;
  dropTarget: DropTarget;
  activeId: ID | null;
  collapsed: boolean;
  onToggleCollapse: (category: PageCategory) => void;
  onAddPage?: (c: PageCategory) => void;
  onRename?: (c: PageCategory) => void;
  onDelete?: (c: PageCategory) => void;
  onHide?: (c: PageCategory) => void;
  subtitleByPageId: Map<ID, string>;
  sortMode: SortMode;
  onSetSortMode: (category: PageCategory, mode: SortMode) => void;
  isLoading?: boolean;
  canEditContent: boolean;
}) {
  const { setNodeRef: setBodyRef } = useDroppable({
    id: `section:${category}`,
  });
  const { setNodeRef: setHeaderRef } = useDroppable({
    id: `section-header:${category}`,
  });

  const isSectionDrop =
    dropTarget?.kind === "section" && dropTarget.category === category;

  const { setActiveTab } = useLibrary();

  const onLibraryClick = useCallback(() => {
    if (category === "Template" || category === "Recent") return;
    setActiveTab(category);
  }, [setActiveTab, category]);

  const onAddClick = useCallback(
    () => (category === "Recent" ? undefined : onAddPage?.(category)),
    [onAddPage, category],
  );

  const { t } = useTranslation();

  const isRecent = category === "Recent";

  const { setCustomizeSidebarOpen } = useEditorLayoutActions();

  const menu = useMemo(() => {
    if (isRecent) return undefined;
    return (
      <>
        <SectionMenuLabel>Order by</SectionMenuLabel>
        <SectionMenuItem
          label="Recent"
          selected={sortMode === "recent"}
          closeOnClick={false}
          onClick={() => onSetSortMode(category, "recent")}
        />
        <SectionMenuItem
          label="Custom (drag to arrange)"
          selected={sortMode === "custom"}
          closeOnClick={false}
          onClick={() => onSetSortMode(category, "custom")}
        />
        <SectionMenuSeparator />
        <SectionMenuItem
          icon={<Pencil size={14} />}
          label="Rename"
          onClick={() => onRename?.(category)}
        />
        <SectionMenuItem
          icon={<EyeOff size={14} />}
          label="Hide section"
          onClick={() => onHide?.(category)}
        />
        <SectionMenuSeparator />
        <SectionMenuItem
          icon={<Layout size={14} />}
          label="Customize sidebar"
          onClick={() => setCustomizeSidebarOpen?.(true)}
        />
        <SectionMenuItem
          danger
          icon={<Trash2 size={14} />}
          label="Delete"
          onClick={() => onDelete?.(category)}
        />
      </>
    );
  }, [
    isRecent,
    sortMode,
    category,
    onSetSortMode,
    onRename,
    onHide,
    onDelete,
    setCustomizeSidebarOpen,
  ]);

  const onToggleCollapseMemo = useCallback(
    () => onToggleCollapse(category),
    [onToggleCollapse, category],
  );

  return (
    <Section
      label={t(CATEGORY_TRANSLATION_MAP[category]) ?? category}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapseMemo}
      headerRef={setHeaderRef}
      bodyRef={setBodyRef}
      dropActive={isSectionDrop}
      onAddClick={onAddClick}
      addLabel={`New page in ${category}`}
      menuLabel={`${category} options`}
      hasLibrary={true}
      onLibraryClick={onLibraryClick}
      menu={menu}
    >
      {isLoading
        ? Array.from({ length: 4 }).map((_, i) => (
            <PageRowSkeleton key={i} index={i} />
          ))
        : isRecent
          ? topLevel.map((node) => (
              <PageItem
                key={node.page.id}
                page={node.page}
                depth={0}
                disableActive={false}
                showChevron={false}
                canEditContent={canEditContent}
              />
            ))
          : topLevel.map((node) => (
              <TreeRow
                key={node.page.id}
                node={node}
                depth={0}
                expandedIds={expandedIds}
                onToggleExpand={onToggleExpand}
                dropTarget={dropTarget}
                activeId={activeId}
                subtitleByPageId={subtitleByPageId}
                canEditContent={canEditContent}
              />
            ))}
    </Section>
  );
}

// ── SectionDragWrapper: the whole section is the drag source ────────────────
// Same pattern as TreeRow: grab anywhere, drag only activates past a few
// pixels of pointer movement (PointerSensor's activationConstraint), so
// ordinary clicks on buttons inside the section still work untouched.
// width: "100%" is explicit here — without it this wrapper can starve
// Section's internal layout down to near-zero width, which is what caused
// the section label to wrap one letter per line during drag.
function SectionDragWrapper({
  category,
  children,
}: {
  category: PageCategory;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `${SECTION_DRAG_PREFIX}${category}` });

  return (
    <div
      ref={setNodeRef}
      style={{
        position: "relative",
        width: "100%",
        // The sortable transform shifts this section aside as another drags
        // past it, opening a real gap to drop into — replacing the old
        // before/after line, which marked a target without making room for it.
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 1 : undefined,
      }}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

const EMPTY_NODES: PageTreeNode[] = [];

export const SidebarTree = memo(function SidebarTree({
  tree,
  teamspaces,
  groups,
  onMovePage,
  onAddPageToSection,
  onRenameSection,
  onDeleteSection,
  onHideSection,
  isLoading,
}: SidebarTreeProps) {
  // Join teamspace records to their pages by id → "N members" per teamspace-page.
  // Only teamspace-pages land in this map; everything else has no subtitle.
  const subtitleByPageId = useMemo(() => {
    const m = new Map<ID, string>();
    for (const ts of teamspaces) {
      const n = effectiveMemberCount(ts, groups);
      m.set(ts.id, `${n} member${n === 1 ? "" : "s"}`);
    }
    return m;
  }, [teamspaces, groups]);

  // Sort mode is set once per section and governs every depth beneath it.
  // Custom order is a map of scopeKey → ordered ids, one scope per set of
  // siblings (a section's top-level pages, or any page's children).
  const [sortModeByCategory, setSortModeByCategory] = useSectionSortModes();
  const [customOrder, setCustomOrder] = useCustomOrder();
  // Display order of the sections themselves — the set is still fixed and
  // closed, only their sequence is user-configurable.
  const [sectionOrder, setSectionOrder] = useSectionOrder();

  const setSortModeForCategory = useCallback(
    (category: PageCategory, mode: SortMode) => {
      setSortModeByCategory((prev) => ({ ...prev, [category]: mode }));
    },
    [setSortModeByCategory],
  );

  // category is root-membership only (order-independent) — walk the raw tree.
  const categoryByPageId = useMemo(() => buildCategoryByPageId(tree), [tree]);

  // The tree actually rendered — each section's own sort mode applied
  // recursively to its whole subtree. Computed over the FULL fixed category
  // set regardless of display order or hidden state (data must stay ready
  // in case a hidden section is unhidden later).
  const sortedTree = useMemo(() => {
    const result = {} as Record<PageCategory, PageTreeNode[]>;
    for (const category of DEFAULT_SECTION_ORDER) {
      const mode = getSortMode(sortModeByCategory, category);
      result[category] = applySectionSort(
        tree[category] ?? [],
        category,
        mode,
        customOrder,
      );
    }
    return result;
  }, [tree, sortModeByCategory, customOrder]);

  const [activeId, setActiveId] = useState<ID | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const [expandedIds, setExpandedIds] = useState<Set<ID>>(new Set());
  const [hidden, toggleHidden] = useHiddenSections();

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() =>
    // While loading, `tree` is empty — collapsing every section on that basis
    // would hide the skeleton rows entirely. Only auto-collapse empty sections
    // once we actually know they're empty.
    isLoading
      ? new Set<string>()
      : new Set(
          DEFAULT_SECTION_ORDER.filter((c) => (tree[c]?.length ?? 0) === 0),
        ),
  );
  const { person } = useCurrentPerson();

  // Built from the SORTED tree — reorder math needs the currently displayed
  // order, not raw tree order, so untouched siblings don't silently reshuffle
  // the first time a section switches into custom mode.
  const nodeById = useMemo(() => {
    const m = new Map<ID, PageTreeNode>();
    const walk = (nodes: PageTreeNode[]) => {
      for (const n of nodes) {
        m.set(n.page.id, n);
        if (n.children.length) walk(n.children);
      }
    };
    for (const cat of DEFAULT_SECTION_ORDER) walk(sortedTree[cat] ?? []);
    return m;
  }, [sortedTree]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const onDragOver = (e: DragOverEvent) => {
    const { over, active, activatorEvent } = e;
    if (!over) {
      setDropTarget(null);
      return;
    }
    const activeIdStr = String(active.id);
    const overId = over.id;

    // Section reorder is handled by SortableContext's own shift — the
    // siblings animate apart, so no manual dropTarget is computed here.
    if (activeIdStr.startsWith(SECTION_DRAG_PREFIX)) return;

    // ── Page drag (unchanged) ────────────────────────────────────────────
    if (typeof overId === "string" && overId.startsWith("section:")) {
      setDropTarget({
        kind: "section",
        category: overId.slice("section:".length) as PageCategory,
      });
      return;
    }
    if (typeof overId === "string" && overId.startsWith("section-header:")) {
      setDropTarget({
        kind: "section",
        category: overId.slice("section-header:".length) as PageCategory,
      });
      return;
    }

    const overPageId = String(overId);
    const activePageId = activeIdStr;

    const activeNode = nodeById.get(activePageId);
    if (activeNode) {
      const subtree = collectSubtreeIds(activeNode);
      if (subtree.has(overPageId)) {
        const overNode = nodeById.get(overPageId);
        if (overNode && overNode.page.parentId == null) {
          setDropTarget({ kind: "section", category: overNode.page.category });
        } else {
          setDropTarget(null);
        }
        return;
      }
    }

    const rect = over.rect;
    const pointerY =
      (activatorEvent as PointerEvent | undefined)?.clientY != null
        ? (activatorEvent as PointerEvent).clientY + e.delta.y
        : rect.top + rect.height / 2;

    const offset = pointerY - rect.top;
    const third = rect.height / 3;
    let zone: DropZone;
    if (offset < third) zone = "before";
    else if (offset > rect.height - third) zone = "after";
    else zone = "inside";

    setDropTarget({ kind: "page", pageId: overPageId, zone });
  };

  // Persist a custom-order position for the destination scope, IF that
  // scope's section is currently in "custom" mode. In "recent" mode this is
  // a no-op — order is computed from updatedAt, not draggable.
  const persistOrderIfCustom = useCallback(
    (
      newParentId: ID | null,
      destCategory: PageCategory,
      movedId: ID,
      targetId: ID | null,
      position: "before" | "after" | "end",
    ) => {
      const mode = getSortMode(sortModeByCategory, destCategory);
      if (mode !== "custom") return;

      const scopeKey =
        newParentId == null
          ? scopeKeyForRoots(destCategory)
          : scopeKeyForChildren(newParentId);

      const currentSiblings =
        newParentId == null
          ? (sortedTree[destCategory] ?? [])
          : (nodeById.get(newParentId)?.children ?? []);
      const currentIds = currentSiblings.map((n) => n.page.id);

      const newOrder = reorderScope(currentIds, movedId, targetId, position);
      setCustomOrder((prev) => ({ ...prev, [scopeKey]: newOrder }));
    },
    [sortModeByCategory, sortedTree, nodeById, setCustomOrder],
  );

  const onDragEnd = (e: DragEndEvent) => {
    const activeIdStr = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;

    setActiveId(null);
    setDropTarget(null);

    // ── Section reorder — sortable: resolve against over.id, arrayMove ────
    if (activeIdStr.startsWith(SECTION_DRAG_PREFIX)) {
      if (!overId || !overId.startsWith(SECTION_DRAG_PREFIX)) return;
      const moved = activeIdStr.slice(
        SECTION_DRAG_PREFIX.length,
      ) as PageCategory;
      const overCat = overId.slice(SECTION_DRAG_PREFIX.length) as PageCategory;
      if (moved === overCat) return;
      setSectionOrder((prev) => {
        const from = prev.indexOf(moved);
        const to = prev.indexOf(overCat);
        if (from === -1 || to === -1) return prev;
        return arrayMove(prev, from, to);
      });
      return;
    }

    // ── Page drag (unchanged) ────────────────────────────────────────────
    const target = dropTarget;
    if (!target) return;

    const pageId = activeIdStr;

    if (target.kind === "section") {
      onMovePage({ pageId, newParentId: null, category: target.category });
      persistOrderIfCustom(null, target.category, pageId, null, "end");
      setCollapsedSections((s) => {
        if (!s.has(target.category)) return s;
        const n = new Set(s);
        n.delete(target.category);
        return n;
      });
      return;
    }

    const overNode = nodeById.get(target.pageId);
    if (!overNode) return;
    const overPage = overNode.page;

    if (overPage.id === pageId) {
      if (overPage.parentId == null) {
        onMovePage({
          pageId,
          newParentId: null,
          category: overPage.category,
        });
      }
      return;
    }

    if (target.zone === "inside") {
      const targetOwner = nodeById.get(target.pageId)?.page.ownerId;
      if (targetOwner !== person?.id) return;
      onMovePage({ pageId, newParentId: target.pageId });
      const destCategory = categoryByPageId.get(target.pageId);
      if (destCategory) {
        persistOrderIfCustom(target.pageId, destCategory, pageId, null, "end");
      }
      setExpandedIds((s) => new Set(s).add(target.pageId));
    } else {
      const isTopLevel = overPage.parentId == null;
      onMovePage({
        pageId,
        newParentId: overPage.parentId ?? null,
        ...(isTopLevel ? { category: overPage.category } : {}),
      });
      const destCategory = isTopLevel
        ? overPage.category
        : categoryByPageId.get(overPage.parentId!);
      if (destCategory) {
        persistOrderIfCustom(
          overPage.parentId ?? null,
          destCategory,
          pageId,
          overPage.id,
          target.zone,
        );
      }
    }
  };

  const onToggleExpand = useCallback(
    (id: ID) =>
      setExpandedIds((s) => {
        const n = new Set(s);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        return n;
      }),
    [],
  );

  const { activePageId } = useActivePageState();

  // Capability for the active page, computed ONCE here instead of in every
  // PageItem. Previously ~30 rows each called usePageCapabilities(activePageId)
  // against the same key — that was the 55-observer page-role line in devtools.
  const { canEditContent } = usePageCapabilities(activePageId);

  // Keep the active page reachable: expand its ancestor chain and un-collapse
  // its section whenever the current page changes. Additive only — never
  // collapses or contracts anything the user opened.
  useEffect(() => {
    if (activePageId == null) return;

    const node = nodeById.get(activePageId);
    if (!node) return; // page isn't in the sidebar tree

    // Climb parentId to collect ancestors (excludes the page itself).
    const ancestors: ID[] = [];
    let cur: PageTreeNode | undefined = node;
    while (cur && cur.page.parentId != null) {
      const parent = nodeById.get(cur.page.parentId);
      if (!parent) break;
      ancestors.push(parent.page.id);
      cur = parent;
    }

    if (ancestors.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpandedIds((prev) => {
        let changed = false;
        const next = new Set(prev);
        for (const id of ancestors) {
          if (!next.has(id)) {
            next.add(id);
            changed = true;
          }
        }
        return changed ? next : prev; // no new Set unless something changed
      });
    }

    const category = categoryByPageId.get(activePageId);
    if (category != null) {
      setCollapsedSections((prev) => {
        if (!prev.has(category)) return prev;
        const next = new Set(prev);
        next.delete(category);
        return next;
      });
    }
  }, [activePageId, nodeById, categoryByPageId]);

  const onToggleCollapse = useCallback(
    (category: string) =>
      setCollapsedSections((s) => {
        const n = new Set(s);
        if (n.has(category)) n.delete(category);
        else n.add(category);
        return n;
      }),
    [],
  );

  const handleHide = useCallback(
    (c: PageCategory) => {
      toggleHidden(c);
      onHideSection?.(c);
    },
    [toggleHidden, onHideSection],
  );

  const onSetSortMode = useCallback(
    (category: PageCategory, mode: SortMode) =>
      setSortModeForCategory(category, mode),
    [setSortModeForCategory],
  );

  const activeNode = activeId != null ? nodeById.get(activeId) : null;
  const isDraggingSection = activeId?.startsWith(SECTION_DRAG_PREFIX) ?? false;
  const visibleCategories = sectionOrder.filter((c) => !hidden.has(c));

  const sectionItems = useMemo(
    () => visibleCategories.map((c) => `${SECTION_DRAG_PREFIX}${c}`),
    [visibleCategories],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={treeCollisionDetection}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setDropTarget(null);
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <SortableContext
          items={sectionItems}
          strategy={verticalListSortingStrategy}
        >
          {visibleCategories.map((category) => (
            <SectionDragWrapper key={category} category={category}>
              <TreeSection
                category={category}
                topLevel={sortedTree[category] ?? EMPTY_NODES}
                expandedIds={expandedIds}
                onToggleExpand={onToggleExpand}
                dropTarget={dropTarget}
                activeId={activeId}
                collapsed={collapsedSections.has(category)}
                onToggleCollapse={onToggleCollapse}
                onAddPage={onAddPageToSection}
                onRename={onRenameSection}
                onDelete={onDeleteSection}
                onHide={handleHide}
                subtitleByPageId={subtitleByPageId}
                sortMode={getSortMode(sortModeByCategory, category)}
                onSetSortMode={onSetSortMode}
                isLoading={isLoading}
                canEditContent={canEditContent}
              />
            </SectionDragWrapper>
          ))}
        </SortableContext>
      </div>

      <DragOverlay>
        {isDraggingSection && activeId ? (
          <div
            style={{
              padding: "6px 12px",
              borderRadius: "var(--tt-radius-md)",
              background: "var(--tt-card-bg-color)",
              border: "0.5px solid var(--tt-border-color)",
              boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--tt-text-primary)",
              opacity: 0.7,
            }}
          >
            {activeId.slice(SECTION_DRAG_PREFIX.length)}
          </div>
        ) : activeNode ? (
          <div className="sidebar-drag-overlay" style={{ opacity: 0.7 }}>
            <PageItem page={activeNode.page} canEditContent={canEditContent} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
});
