import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  ChevronRight,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  EyeOff,
  ChevronDown,
} from "lucide-react";
import {
  DndContext,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragOverlay,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { ID, Page, PageCategory } from "src/types";
import { PageItem } from "../page-item";
import "./sidebar-sections.scss";

// Categories rendered as sections (Page + Template handled elsewhere).
const SECTION_CATEGORIES: PageCategory[] = [
  "Private",
  "Favorites",
  "Shared",
  "Teamspaces",
];

// Pages with no category (or a non-section one like "Page"/"Recent") fall here.
const DEFAULT_CATEGORY: PageCategory = "Private";

const PREVIEW_COUNT = 5;

type ItemsMap = Record<string, ID[]>;

export interface SidebarSectionsProps {
  pages: Page[];
  // Persist a reorder within a section (needs an order field on Page to stick).
  onReorder?: (category: PageCategory, orderedIds: ID[]) => void;
  // Persist a move between sections — should set page.category to `toCategory`.
  onMovePage?: (
    pageId: number,
    toCategory: PageCategory,
    toIndex: number,
  ) => void;
  // Section-level actions.
  onAddPageToSection?: (category: PageCategory) => void;
  onAddSection?: () => void;
  onRenameSection?: (category: PageCategory) => void;
  onDeleteSection?: (category: PageCategory) => void;
  onHideSection?: (category: PageCategory) => void;
}

// Build the per-category ordered id map, preserving existing manual order.
function buildItems(
  prev: ItemsMap,
  pages: Page[],
  categories: PageCategory[],
): ItemsMap {
  const byCat: Record<ID, Page[]> = {};
  for (const cat of categories) byCat[cat] = [];
  for (const p of pages) {
    if (p.category === "Template") continue; // templates render elsewhere
    // Use the page's category if it maps to a section, else fall back.
    const cat = p.category && byCat[p.category] ? p.category : DEFAULT_CATEGORY;
    byCat[cat]?.push(p);
  }

  const next: ItemsMap = {};
  for (const cat of categories) {
    const present = byCat[cat];
    const presentIds = new Set(present.map((p) => p.id));
    // Keep previously-ordered ids that still exist...
    const kept = (prev[cat] ?? []).filter((id) => presentIds.has(id));
    const keptSet = new Set(kept);
    // ...then append any new ones, most-recent first.
    const added = present
      .filter((p) => !keptSet.has(p.id))
      .sort(
        (a, b) =>
          new Date(b.updatedAt ?? b.createdAt).getTime() -
          new Date(a.updatedAt ?? a.createdAt).getTime(),
      )
      .map((p) => p.id);
    next[cat] = [...kept, ...added];
  }
  return next;
}

// ---- Sortable row: drag handle carries listeners so the row stays clickable ----
function SortableRow({ page }: { page: Page }) {
  const { setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="sidebar-section__row">
      <PageItem page={page} />
    </div>
  );
}

// ---- The "..." menu popover ----
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

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);

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

// ---- A single section: header (collapse + actions) + droppable body ----
function Section({
  category,
  ids,
  pagesById,
  collapsed,
  expanded,
  onToggleCollapse,
  onToggleExpand,
  onAddPage,
  onRename,
  onDelete,
  onHide,
}: {
  category: PageCategory;
  ids: ID[];
  pagesById: Map<ID, Page>;
  collapsed: boolean;
  expanded: boolean;
  onToggleCollapse: () => void;
  onToggleExpand: () => void;
  onAddPage?: (c: PageCategory) => void;
  onRename?: (c: PageCategory) => void;
  onDelete?: (c: PageCategory) => void;
  onHide?: (c: PageCategory) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: `section:${category}` });
  const [shouldShow, setShouldShow] = useState(false);

  const visibleIds = expanded ? ids : ids.slice(0, PREVIEW_COUNT);
  const hiddenCount = ids.length - visibleIds.length;

  return (
    <div className="sidebar-section">
      <div
        className="sidebar-section__header"
        onClick={onToggleCollapse}
        style={{ position: "relative" }}
        onMouseOver={() => setShouldShow(true)}
        onMouseLeave={() => setShouldShow(false)}
      >
        <span className="sidebar-section__label">{category}</span>
        {/* {ids.length > 0 && (
          <span className="sidebar-section__count">{ids.length}</span>
        )} */}

        <span
          style={{
            marginTop: 5,
            opacity: shouldShow ? 1 : 0,
            transition: "opacity 0.15s ease",
          }}
        >
          {!collapsed && <ChevronDown size={14} />}
          {collapsed && <ChevronRight size={14} />}
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
            isOver ? " sidebar-section__body--drop-active" : ""
          }`}
        >
          <SortableContext
            items={visibleIds}
            strategy={verticalListSortingStrategy}
          >
            {visibleIds.map((id) => {
              const page = pagesById.get(id);
              return page ? <SortableRow key={id} page={page} /> : null;
            })}
          </SortableContext>

          {ids.length === 0 && (
            <span className="sidebar-section__empty">Empty</span>
          )}

          {hiddenCount > 0 && (
            <button className="sidebar-section__more" onClick={onToggleExpand}>
              <span className="sidebar-section__lead">
                <Plus size={13} />
              </span>
              {hiddenCount} more
            </button>
          )}
          {expanded && ids.length > PREVIEW_COUNT && (
            <button className="sidebar-section__more" onClick={onToggleExpand}>
              <span className="sidebar-section__lead" />
              Show less
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function SidebarSections({
  pages,
  onReorder,
  onMovePage,
  onAddPageToSection,
  onAddSection,
  onRenameSection,
  onDeleteSection,
  onHideSection,
}: SidebarSectionsProps) {
  const [items, setItems] = useState<ItemsMap>(() =>
    buildItems({}, pages, SECTION_CATEGORIES),
  );
  const [activeId, setActiveId] = useState<ID | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const sourceRef = useRef<string | null>(null);

  const pagesById = useMemo(() => {
    const m = new Map<ID, Page>();
    for (const p of pages) m.set(p.id, p);
    return m;
  }, [pages]);

  // Resync section contents when pages actually change — without an effect.
  // Calling setState during render, guarded by a content signature, is React's
  // recommended way to adjust state from props and avoids cascading renders.
  const signature = useMemo(
    () =>
      pages
        .map((p) => `${p.id}:${p.category ?? ""}:${p.updatedAt ?? ""}`)
        .join("|"),
    [pages],
  );
  const [prevSignature, setPrevSignature] = useState(signature);
  if (signature !== prevSignature) {
    setPrevSignature(signature);
    setItems((prev) => buildItems(prev, pages, SECTION_CATEGORIES));
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const findContainer = useCallback(
    (id: ID | undefined): string | undefined => {
      if (id == null) return undefined;
      if (typeof id === "string" && id.startsWith("section:"))
        return id.slice("section:".length);
      if (typeof id === "string" && id in items) return id;
      return Object.keys(items).find((cat) => items[cat].includes(id));
    },
    [items],
  );

  const onDragStart = (e: DragStartEvent) => {
    sourceRef.current = findContainer(e.active.id.toString()) ?? null;
    setActiveId(e.active.id.toString());
  };

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeContainer = findContainer(active.id.toString());
    const overContainer = findContainer(over.id.toString());
    if (!activeContainer || !overContainer || activeContainer === overContainer)
      return;

    setItems((prev) => {
      const activeItems = prev[activeContainer] ?? [];
      const overItems = prev[overContainer] ?? [];
      const overIsContainer =
        typeof over.id === "string" && over.id.startsWith("section:");
      const overIndex = overIsContainer
        ? overItems.length
        : overItems.indexOf(over.id.toString());
      const insertAt = overIndex >= 0 ? overIndex : overItems.length;

      return {
        ...prev,
        [activeContainer]: activeItems.filter((id) => id !== active.id),
        [overContainer]: [
          ...overItems.slice(0, insertAt),
          active.id.toString(),
          ...overItems.slice(insertAt),
        ],
      };
    });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    const dest = findContainer(active.id.toString());
    const source = sourceRef.current;
    sourceRef.current = null;
    setActiveId(null);
    if (!dest) return;

    if (source === dest) {
      const arr = items[dest] ?? [];
      const oldIndex = arr.indexOf(active.id.toString());
      let newIndex = arr.length - 1;
      if (over && !(over.id as string).toString().startsWith("section:")) {
        const idx = arr.indexOf(over.id.toString());
        if (idx >= 0) newIndex = idx;
      }
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        const reordered = arrayMove(arr, oldIndex, newIndex);
        setItems((prev) => ({ ...prev, [dest]: reordered }));
        onReorder?.(dest as PageCategory, reordered);
      }
    } else {
      const idx = (items[dest] ?? []).indexOf(active.id.toString());
      onMovePage?.(Number(active.id), dest as PageCategory, idx);
    }
  };

  const toggle = (
    set: Set<string>,
    key: string,
    setter: (s: Set<string>) => void,
  ) => {
    const next = new Set(set);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }

    setter(next);
  };

  const handleHide = (c: PageCategory) => {
    toggle(hidden, c, setHidden);
    onHideSection?.(c);
  };

  const activePage = activeId != null ? pagesById.get(activeId) : null;
  const visibleCategories = SECTION_CATEGORIES.filter((c) => !hidden.has(c));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visibleCategories.map((category) => (
          <Section
            key={category}
            category={category}
            ids={items[category] ?? []}
            pagesById={pagesById}
            collapsed={collapsed.has(category)}
            expanded={expanded.has(category)}
            onToggleCollapse={() => toggle(collapsed, category, setCollapsed)}
            onToggleExpand={() => toggle(expanded, category, setExpanded)}
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
            <PageItem page={activePage} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
