import {
  useState,
  useMemo,
  useRef,
  useCallback,
  type CSSProperties,
} from "react";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  EyeOff,
  Lock,
  Star,
  Users,
  UsersRound,
  FileText,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  DragOverlay,
  pointerWithin,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";

import type { Page, PageCategory } from "../types";
import { PageItem } from "../page-item";
import "./sidebar-sections.scss";
import "./sidebar-tree.scss";
import { Button } from "src/components/tiptap-ui-primitive/button";

const SECTION_CATEGORIES: PageCategory[] = [
  "Private",
  "Favorites",
  "Shared",
  "Teamspaces",
];
const DEFAULT_CATEGORY: PageCategory = "Private";

type DropZone = "before" | "after" | "inside";

type DropTarget =
  | { kind: "page"; pageId: number; zone: DropZone }
  | { kind: "section"; category: PageCategory }
  | null;

export interface SidebarTreeProps {
  pages: Page[];
  onMovePage: (args: {
    pageId: number;
    newParentId: number | null;
    category?: PageCategory;
  }) => void;
  onAddPageToSection?: (category: PageCategory) => void;
  onAddSection?: () => void;
  onRenameSection?: (category: PageCategory) => void;
  onDeleteSection?: (category: PageCategory) => void;
  onHideSection?: (category: PageCategory) => void;
}

function collectSubtreeIds(
  page: Page,
  acc: Set<number> = new Set(),
): Set<number> {
  acc.add(page.id);
  for (const c of page.children ?? []) collectSubtreeIds(c, acc);
  return acc;
}

// ── Recursive tree row ─────────────────────────────────────────────────────
function TreeRow({
  page,
  depth,
  expandedIds,
  onToggleExpand,
  dropTarget,
  activeId,
}: {
  page: Page;
  depth: number;
  expandedIds: Set<number>;
  onToggleExpand: (id: number) => void;
  dropTarget: DropTarget;
  activeId: number | null;
}) {
  const hasChildren = (page.children?.length ?? 0) > 0;
  const isExpanded = expandedIds.has(page.id);

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
  } = useDraggable({
    id: page.id,
  });
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
    opacity: isDragging ? 0.4 : 1,
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

        {/* Caret overlays the icon and cross-fades in on row hover.
            Visibility is handled in SCSS; only positioning is inline. */}
        <Button
          className="sidebar-tree__caret"
          variant="ghost"
          style={{
            position: "absolute",
            left: depth * 14 + 6,
            top: "50%",
            transform: "translateY(-50%)",
            padding: 0,
            margin: 0,
            minWidth: 18,
            width: 18,
            height: 18,
            background: "transparent",
            zIndex: 10,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(page.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? (
            <ChevronDown className="tiptap-button-icon" size={14} />
          ) : (
            <ChevronRight className="tiptap-button-icon" size={14} />
          )}
        </Button>

        <div className="sidebar-tree__item">
          <PageItem page={page} disableExpand={true} />
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="sidebar-tree__children">
          {page.children.map((child) => (
            <TreeRow
              key={child.id}
              page={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              dropTarget={dropTarget}
              activeId={activeId}
            />
          ))}
        </div>
      )}
    </>
  );
}

function SectionMenu({
  category,
  onRename,
  onDelete,
  onHide,
  onClose,
}: {
  category: PageCategory;
  onRename?: (c: PageCategory) => void;
  onDelete?: (c: PageCategory) => void;
  onHide?: (c: PageCategory) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const run = (fn?: (c: PageCategory) => void) => {
    fn?.(category);
    onClose();
  };
  return (
    <div
      ref={ref}
      className="sidebar-section-menu"
      style={{ top: 24, right: 0 }}
    >
      <button
        className="sidebar-section-menu__item"
        onClick={() => run(onRename)}
      >
        <Pencil size={14} /> Rename
      </button>
      <button
        className="sidebar-section-menu__item"
        onClick={() => run(onHide)}
      >
        <EyeOff size={14} /> Hide section
      </button>
      <div className="sidebar-section-menu__sep" />
      <button
        className="sidebar-section-menu__item sidebar-section-menu__item--danger"
        onClick={() => run(onDelete)}
      >
        <Trash2 size={14} /> Delete
      </button>
    </div>
  );
}

// Per-section empty-state copy + icon. Falls back to a generic page icon.
const EMPTY_META: Record<
  string,
  { Icon: typeof FileText; title: string; hint: string }
> = {
  Private: {
    Icon: Lock,
    title: "No private pages yet",
    hint: "Pages only you can see live here.",
  },
  Favorites: {
    Icon: Star,
    title: "No favorites yet",
    hint: "Star a page to keep it handy.",
  },
  Shared: {
    Icon: Users,
    title: "Nothing shared yet",
    hint: "Pages shared with you appear here.",
  },
  Teamspaces: {
    Icon: UsersRound,
    title: "No teamspaces yet",
    hint: "Collaborate with your team here.",
  },
};

function SectionEmpty({
  category,
  onAddPage,
}: {
  category: PageCategory;
  onAddPage?: (c: PageCategory) => void;
}) {
  const meta = EMPTY_META[category] ?? {
    Icon: FileText,
    title: "No pages yet",
    hint: "Add a page to get started.",
  };
  const { Icon } = meta;
  return (
    <button
      className="sidebar-section__empty"
      onClick={() => onAddPage?.(category)}
      type="button"
    >
      <span className="sidebar-section__empty-icon">
        <Icon size={16} />
      </span>
      <span className="sidebar-section__empty-text">
        <span className="sidebar-section__empty-title">{meta.title}</span>
        <span className="sidebar-section__empty-hint">{meta.hint}</span>
      </span>
      <span className="sidebar-section__empty-add">
        <Plus size={14} />
      </span>
    </button>
  );
}

// ── Section: header (now a drop target) + body ─────────────────────────────
function Section({
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
}: {
  category: PageCategory;
  topLevel: Page[];
  expandedIds: Set<number>;
  onToggleExpand: (id: number) => void;
  dropTarget: DropTarget;
  activeId: number | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onAddPage?: (c: PageCategory) => void;
  onRename?: (c: PageCategory) => void;
  onDelete?: (c: PageCategory) => void;
  onHide?: (c: PageCategory) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const { setNodeRef } = useDroppable({ id: `section:${category}` });
  const { setNodeRef: setHeaderRef } = useDroppable({
    id: `section-header:${category}`,
  });

  const isSectionDrop =
    dropTarget?.kind === "section" && dropTarget.category === category;

  return (
    <div className="sidebar-section">
      <div
        ref={setHeaderRef}
        className={`sidebar-section__header${
          isSectionDrop ? " sidebar-section__header--drop-active" : ""
        }`}
        onClick={onToggleCollapse}
        style={{ position: "relative" }}
        onMouseOver={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <span className="sidebar-section__label">{category}</span>
        <span
          style={{
            marginTop: 5,
            opacity: hover ? 1 : 0,
            transition: "opacity 0.15s ease",
          }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </span>
        <div
          className="sidebar-section__actions"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="sidebar-section__action-btn"
            aria-label={`New page in ${category}`}
            onClick={() => onAddPage?.(category)}
          >
            <Plus size={15} />
          </button>
          <button
            className="sidebar-section__action-btn"
            aria-label={`${category} options`}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MoreHorizontal size={15} />
          </button>
        </div>
        {menuOpen && (
          <SectionMenu
            category={category}
            onRename={onRename}
            onDelete={onDelete}
            onHide={onHide}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </div>

      {!collapsed && (
        <div
          ref={setNodeRef}
          className={`sidebar-section__body${
            isSectionDrop ? " sidebar-section__body--drop-active" : ""
          }`}
        >
          {topLevel.map((page) => (
            <TreeRow
              key={page.id}
              page={page}
              depth={0}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              dropTarget={dropTarget}
              activeId={activeId}
            />
          ))}
          {topLevel.length === 0 && (
            <SectionEmpty category={category} onAddPage={onAddPage} />
          )}
        </div>
      )}
    </div>
  );
}

export function SidebarTree({
  pages,
  onMovePage,
  onAddPageToSection,
  onAddSection,
  onRenameSection,
  onDeleteSection,
  onHideSection,
}: SidebarTreeProps) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  // Collapse state lifted here so a drop on a collapsed section can expand it.
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(),
  );

  const pageById = useMemo(() => {
    const m = new Map<number, Page>();
    const walk = (list: Page[]) => {
      for (const p of list) {
        m.set(p.id, p);
        if (p.children?.length) walk(p.children);
      }
    };
    walk(pages);
    return m;
  }, [pages]);

  const topLevelByCategory = useMemo(() => {
    const by: Record<string, Page[]> = {};
    for (const c of SECTION_CATEGORIES) by[c] = [];
    for (const p of pages) {
      if (p.parentId != null) continue;
      if (p.category === "Template") continue;
      const cat = p.category && by[p.category] ? p.category : DEFAULT_CATEGORY;
      by[cat].push(p);
    }
    return by;
  }, [pages]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(Number(e.active.id));
  };

  const onDragOver = (e: DragOverEvent) => {
    const { over, active, activatorEvent } = e;
    if (!over) {
      setDropTarget(null);
      return;
    }
    const overId = over.id;

    // Section body OR header/label → drop into that section.
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

    const overPageId = Number(overId);
    const activePageId = Number(active.id);

    // Over a row in the dragged page's own subtree → fall back to that row's
    // section instead of cancelling, so dragging within your own section works.
    const activePage = pageById.get(activePageId);
    if (activePage) {
      const subtree = collectSubtreeIds(activePage);
      if (subtree.has(overPageId)) {
        const overPage = pageById.get(overPageId);
        if (overPage && overPage.parentId == null && overPage.category) {
          setDropTarget({ kind: "section", category: overPage.category });
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

  const onDragEnd = (e: DragEndEvent) => {
    const target = dropTarget;
    const pageId = Number(e.active.id);
    setActiveId(null);
    setDropTarget(null);
    if (!target) return;

    if (target.kind === "section") {
      onMovePage({ pageId, newParentId: null, category: target.category });
      // expand the section so the dropped page is visible
      setCollapsedSections((s) => {
        if (!s.has(target.category)) return s;
        const n = new Set(s);
        n.delete(target.category);
        return n;
      });
      return;
    }

    const overPage = pageById.get(target.pageId);
    if (!overPage) return;

    // Dropping onto itself → treat as a move into its own section (no-op if
    // unchanged). Prevents the one-page-section dead drop.
    if (overPage.id === pageId) {
      if (overPage.parentId == null && overPage.category) {
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
      setExpandedIds((s) => new Set(s).add(target.pageId));
    } else {
      const isTopLevel = overPage.parentId == null;
      onMovePage({
        pageId,
        newParentId: overPage.parentId ?? null,
        ...(isTopLevel && overPage.category
          ? { category: overPage.category }
          : {}),
      });
    }
  };

  const onToggleExpand = (id: number) =>
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

  const activePage = activeId != null ? pageById.get(activeId) : null;
  const visibleCategories = SECTION_CATEGORIES.filter((c) => !hidden.has(c));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
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
          <Section
            key={category}
            category={category}
            topLevel={topLevelByCategory[category] ?? []}
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
          />
        ))}

        {onAddSection && (
          <button className="sidebar-add-section" onClick={onAddSection}>
            <span className="sidebar-section__lead">
              <Plus size={14} />
            </span>
            Add section
          </button>
        )}
      </div>

      <DragOverlay>
        {activePage ? (
          <div className="sidebar-drag-overlay">
            <PageItem page={activePage} disableExpand={true} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
