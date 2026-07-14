import {
  useState,
  useMemo,
  useCallback,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Plus, Pencil, Trash2, EyeOff } from "lucide-react";
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
import type { LibraryTab } from "./library-palette";
import { useTranslation } from "react-i18next";
import {
  applySectionSort,
  buildCategoryByPageId,
  DEFAULT_SECTION_ORDER,
  getSortMode,
  reorderList,
  reorderScope,
  scopeKeyForChildren,
  scopeKeyForRoots,
  useCustomOrder,
  useSectionOrder,
  useSectionSortModes,
  type SortMode,
} from "../hooks/use-sidebar-order";
import { SidebarTreeSkeleton } from "./skeletons/sidebar-tree-skeleton";
import { PageRowSkeleton } from "./skeletons";

type DropZone = "before" | "after" | "inside";

type DropTarget =
  | { kind: "page"; pageId: ID; zone: DropZone }
  | { kind: "section"; category: PageCategory }
  | {
      kind: "section-reorder";
      category: PageCategory;
      zone: "before" | "after";
    }
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
}: {
  node: PageTreeNode;
  depth: number;
  expandedIds: Set<ID>;
  onToggleExpand: (id: ID) => void;
  dropTarget: DropTarget;
  activeId: ID | null;
  subtitleByPageId: Map<ID, string>;
}) {
  const page = node.page;
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(page.id);

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
  } = useDraggable({ id: page.id });
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

const SECTION_ADD_LABEL: Record<string, string> = {
  private: "New private page",
  shared: "Start collaborating",
  teamspaces: "Create a teamspace",
  favorites: "Star a page to pin it here",
};

// ── SectionAddPageButton: persistent "+ Add page" affordance ────────────────
// Always rendered beneath a section's page list, empty or not.
function SectionAddPageButton({
  category,
  onAddPage,
}: {
  category: PageCategory;
  onAddPage?: (c: PageCategory) => void;
}) {
  return (
    <button
      className="sidebar-section__add-page"
      onClick={() => onAddPage?.(category)}
      type="button"
    >
      <Plus size={14} />
      <span>{SECTION_ADD_LABEL[(category as string).toLowerCase()]}</span>
    </button>
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
  Favorites: "section.favorites",
  Shared: "section.shared",
  Private: "section.private",
  Template: "section.template",
  Teamspaces: "section.teamspaces",
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
}: {
  category: PageCategory;
  topLevel: PageTreeNode[];
  expandedIds: Set<ID>;
  onToggleExpand: (id: ID) => void;
  dropTarget: DropTarget;
  activeId: ID | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onAddPage?: (c: PageCategory) => void;
  onRename?: (c: PageCategory) => void;
  onDelete?: (c: PageCategory) => void;
  onHide?: (c: PageCategory) => void;
  subtitleByPageId: Map<ID, string>;
  sortMode: SortMode;
  onSetSortMode: (mode: SortMode) => void;
  isLoading?: boolean;
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

  const handleLibraryClick = (tab: LibraryTab) => {
    setActiveTab(tab);
  };
  const { t } = useTranslation();

  return (
    <Section
      label={t(CATEGORY_TRANSLATION_MAP[category]) ?? category}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      headerRef={setHeaderRef}
      bodyRef={setBodyRef}
      dropActive={isSectionDrop}
      onAddClick={() => onAddPage?.(category)}
      addLabel={`New page in ${category}`}
      menuLabel={`${category} options`}
      hasLibrary={true}
      onLibraryClick={() => {
        if (category === "Template") return;
        handleLibraryClick(category);
      }}
      menu={
        <>
          <SectionMenuLabel>Order by</SectionMenuLabel>
          <SectionMenuItem
            label="Recent"
            selected={sortMode === "recent"}
            closeOnClick={false}
            onClick={() => onSetSortMode("recent")}
          />
          <SectionMenuItem
            label="Custom (drag to arrange)"
            selected={sortMode === "custom"}
            closeOnClick={false}
            onClick={() => onSetSortMode("custom")}
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
            danger
            icon={<Trash2 size={14} />}
            label="Delete"
            onClick={() => onDelete?.(category)}
          />
        </>
      }
    >
      {isLoading
        ? Array.from({ length: 4 }).map((_, i) => (
            <PageRowSkeleton key={i} index={i} />
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
            />
          ))}

     {!isLoading && (
        <SectionAddPageButton category={category} onAddPage={onAddPage} />
      )}
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
  dropTarget,
  activeId,
  children,
}: {
  category: PageCategory;
  dropTarget: DropTarget;
  activeId: ID | null;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `${SECTION_DRAG_PREFIX}${category}`,
  });

  const isDragging = activeId === `${SECTION_DRAG_PREFIX}${category}`;
  const zone =
    dropTarget?.kind === "section-reorder" && dropTarget.category === category
      ? dropTarget.zone
      : null;

  return (
    <div
      ref={setNodeRef}
      style={{
        position: "relative",
        width: "100%",
        opacity: isDragging ? 0.4 : 1,
      }}
      {...attributes}
      {...listeners}
    >
      {zone === "before" && (
        <div
          style={{
            position: "absolute",
            top: -5,
            left: 4,
            right: 4,
            height: 2,
            borderRadius: 2,
            background: "var(--tt-brand-color-400)",
          }}
        />
      )}

      {children}

      {zone === "after" && (
        <div
          style={{
            position: "absolute",
            bottom: -5,
            left: 4,
            right: 4,
            height: 2,
            borderRadius: 2,
            background: "var(--tt-brand-color-400)",
          }}
        />
      )}
    </div>
  );
}

export function SidebarTree({
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
  const [hidden, setHidden] = useState<Set<string>>(new Set());
 const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    () =>
      // While loading, `tree` is empty — collapsing every section on that basis
      // would hide the skeleton rows entirely. Only auto-collapse empty sections
      // once we actually know they're empty.
      isLoading
        ? new Set<string>()
        : new Set(
            DEFAULT_SECTION_ORDER.filter((c) => (tree[c]?.length ?? 0) === 0),
          ),
  );

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

    // ── Section reorder (dragging a section's grip handle) ─────────────────
    if (activeIdStr.startsWith(SECTION_DRAG_PREFIX)) {
      let hitCategory: PageCategory | null = null;
      if (typeof overId === "string" && overId.startsWith("section:")) {
        hitCategory = overId.slice("section:".length) as PageCategory;
      } else if (
        typeof overId === "string" &&
        overId.startsWith("section-header:")
      ) {
        hitCategory = overId.slice("section-header:".length) as PageCategory;
      } else {
        hitCategory = categoryByPageId.get(String(overId)) ?? null;
      }
      if (!hitCategory) {
        setDropTarget(null);
        return;
      }
      const rect = over.rect;
      const pointerY =
        (activatorEvent as PointerEvent | undefined)?.clientY != null
          ? (activatorEvent as PointerEvent).clientY + e.delta.y
          : rect.top + rect.height / 2;
      const zone: "before" | "after" =
        pointerY - rect.top < rect.height / 2 ? "before" : "after";
      setDropTarget({ kind: "section-reorder", category: hitCategory, zone });
      return;
    }

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
    const target = dropTarget;
    setActiveId(null);
    setDropTarget(null);
    if (!target) return;

    // ── Section reorder ──────────────────────────────────────────────────
    if (activeIdStr.startsWith(SECTION_DRAG_PREFIX)) {
      if (target.kind !== "section-reorder") return;
      const movedCategory = activeIdStr.slice(
        SECTION_DRAG_PREFIX.length,
      ) as PageCategory;
      if (movedCategory === target.category) return;
      setSectionOrder((prev) =>
        reorderList(prev, movedCategory, target.category, target.zone),
      );
      return;
    }

    // ── Page drag (unchanged) ────────────────────────────────────────────
    if (target.kind === "section-reorder") return; // narrowing guard only

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

  const onToggleExpand = (id: ID) =>
    setExpandedIds((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const onToggleCollapse = (category: string) =>
    setCollapsedSections((s) => {
      const n = new Set(s);
      if (n.has(category)) n.delete(category);
      else n.add(category);
      return n;
    });

  const handleHide = (c: PageCategory) => {
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(c)) n.delete(c);
      else n.add(c);
      return n;
    });
    onHideSection?.(c);
  };

  const activeNode = activeId != null ? nodeById.get(activeId) : null;
  const isDraggingSection = activeId?.startsWith(SECTION_DRAG_PREFIX) ?? false;
  const visibleCategories = sectionOrder.filter((c) => !hidden.has(c));

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
        {visibleCategories.map((category) => (
          <SectionDragWrapper
            key={category}
            category={category}
            dropTarget={dropTarget}
            activeId={activeId}
          >
            <TreeSection
              category={category}
              topLevel={sortedTree[category] ?? []}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              dropTarget={dropTarget}
              activeId={activeId}
              collapsed={collapsedSections.has(category)}
              onToggleCollapse={() => onToggleCollapse(category)}
              onAddPage={onAddPageToSection}
              onRename={onRenameSection}
              onDelete={onDeleteSection}
              onHide={handleHide}
              subtitleByPageId={subtitleByPageId}
              sortMode={getSortMode(sortModeByCategory, category)}
              onSetSortMode={(mode) => setSortModeForCategory(category, mode)}
              isLoading={isLoading}
            />
          </SectionDragWrapper>
        ))}
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
            <PageItem page={activeNode.page} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
