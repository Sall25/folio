import { useState, useMemo, useCallback, type CSSProperties } from "react";
import {
  ChevronRight,
  ChevronDown,
  Plus,
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
  Page,
} from "src/types";
import type { PageSections } from "src/hooks/use-pages";
import { PageItem } from "../page-item";
import "./sidebar-sections.scss";
import "./sidebar-tree.scss";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Section, SectionMenuItem, SectionMenuSeparator } from "./section";
import { useLibrary } from "../context/library-context";
import type { LibraryTab } from "./library-palette";

// Category sections that remain (Teamspaces is retired — teamspaceId drives those).
const CATEGORY_SECTIONS: PageCategory[] = ["Favorites", "Shared", "Private"];

type DropZone = "before" | "after" | "inside";

// A move destination identity — exactly one of category/teamspace location.
export type SectionRef =
  | { kind: "category"; category: PageCategory }
  | { kind: "teamspace"; teamspaceId: ID };

// A rendered section: a category bucket or a single teamspace.
type SectionDesc =
  | {
      kind: "category";
      key: string;
      category: PageCategory;
      label: string;
      roots: PageTreeNode[];
    }
  | {
      kind: "teamspace";
      key: string;
      teamspaceId: ID;
      label: string;
      icon: string | null;
      roots: PageTreeNode[];
    };

type DropTarget =
  | { kind: "page"; pageId: ID; zone: DropZone }
  | { kind: "section"; sectionKey: string }
  | null;

// Section containers use prefixed ids; page rows use bare page ids.
const isSectionId = (id: string | number) =>
  typeof id === "string" &&
  (id.startsWith("section:") || id.startsWith("section-header:"));

const treeCollisionDetection: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  const collisions = pointer.length ? pointer : rectIntersection(args);
  const pageHit = collisions.find((c) => !isSectionId(c.id));
  return pageHit ? [pageHit] : collisions;
};

// The section key a top-level page belongs to (teamspace if set, else category).
const keyOfRoot = (p: Page): string =>
  p.teamspaceId != null ? `ts:${p.teamspaceId}` : `cat:${p.category}`;

// The move-identity for a section / a top-level sibling. Category moves also
// null the teamspaceId (pulling the page out of any teamspace); teamspace moves
// set teamspaceId and leave category untouched (ignored for teamspace roots).
const identityOfSection = (
  s: SectionDesc,
): { category?: PageCategory; teamspaceId?: ID | null } =>
  s.kind === "category"
    ? { category: s.category, teamspaceId: null }
    : { teamspaceId: s.teamspaceId };

const identityOfRoot = (
  p: Page,
): { category?: PageCategory; teamspaceId?: ID | null } =>
  p.teamspaceId != null
    ? { teamspaceId: p.teamspaceId }
    : { category: p.category, teamspaceId: null };

const refOfSection = (s: SectionDesc): SectionRef =>
  s.kind === "category"
    ? { kind: "category", category: s.category }
    : { kind: "teamspace", teamspaceId: s.teamspaceId };

export interface SidebarTreeProps {
  tree: PageSections;
  /** Teamspaces to show as sections — already membership-filtered + ordered. */
  teamspaces: Teamspace[];
  onMovePage: (args: {
    pageId: ID;
    newParentId: ID | null;
    category?: PageCategory;
    teamspaceId?: ID | null;
  }) => void;
  onAddPageToSection?: (target: SectionRef) => void;
  onAddSection?: () => void;
  onRenameSection?: (category: PageCategory) => void;
  onDeleteSection?: (category: PageCategory) => void;
  onHideSection?: (category: PageCategory) => void;
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
}: {
  node: PageTreeNode;
  depth: number;
  expandedIds: Set<ID>;
  onToggleExpand: (id: ID) => void;
  dropTarget: DropTarget;
  activeId: ID | null;
}) {
  const page = node.page;
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(page.id);
  const [shouldShow, setShouldShow] = useState(true);

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
        onMouseOver={() => setShouldShow(false)}
        onMouseLeave={() => setShouldShow(true)}
      >
        {zone === "before" && (
          <div className="sidebar-tree__line sidebar-tree__line--top" />
        )}
        {zone === "after" && (
          <div className="sidebar-tree__line sidebar-tree__line--bottom" />
        )}

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
          <PageItem page={page} showIcon={hasChildren ? shouldShow : true} />
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="sidebar-tree__children">
          {node.children.map((child) => (
            <TreeRow
              key={child.page.id}
              node={child}
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
};

function SectionEmpty({
  section,
  onAddPage,
}: {
  section: SectionDesc;
  onAddPage?: (target: SectionRef) => void;
}) {
  let Icon: typeof FileText;
  let title: string;
  let hint: string;

  if (section.kind === "category") {
    const meta = EMPTY_META[section.category] ?? {
      Icon: FileText,
      title: "No pages yet",
      hint: "Add a page to get started.",
    };
    Icon = meta.Icon;
    title = meta.title;
    hint = meta.hint;
  } else {
    Icon = UsersRound;
    title = `No pages in ${section.label}`;
    hint = "Add a page to this teamspace.";
  }

  return (
    <button
      className="sidebar-section__empty"
      onClick={() => onAddPage?.(refOfSection(section))}
      type="button"
    >
      <span className="sidebar-section__empty-icon">
        <Icon size={20} />
      </span>
      <span className="sidebar-section__empty-text">
        <span className="sidebar-section__empty-title">{title}</span>
        <span className="sidebar-section__empty-hint">{hint}</span>
      </span>
      <span className="sidebar-section__empty-add">
        <Plus size={14} />
      </span>
    </button>
  );
}

// ── TreeSection: wires dnd-kit droppables into the reusable Section ──────────
function TreeSection({
  section,
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
  section: SectionDesc;
  expandedIds: Set<ID>;
  onToggleExpand: (id: ID) => void;
  dropTarget: DropTarget;
  activeId: ID | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onAddPage?: (target: SectionRef) => void;
  onRename?: (c: PageCategory) => void;
  onDelete?: (c: PageCategory) => void;
  onHide: (section: SectionDesc) => void;
}) {
  const { setNodeRef: setBodyRef } = useDroppable({
    id: `section:${section.key}`,
  });
  const { setNodeRef: setHeaderRef } = useDroppable({
    id: `section-header:${section.key}`,
  });

  const isSectionDrop =
    dropTarget?.kind === "section" && dropTarget.sectionKey === section.key;

  const { setActiveTab } = useLibrary();

  const handleLibraryClick = (tab: LibraryTab) => {
    setActiveTab(tab);
  };

  const isCategory = section.kind === "category";

  return (
    <Section
      label={section.label}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      headerRef={setHeaderRef}
      bodyRef={setBodyRef}
      dropActive={isSectionDrop}
      onAddClick={() => onAddPage?.(refOfSection(section))}
      addLabel={`New page in ${section.label}`}
      menuLabel={`${section.label} options`}
      hasLibrary={isCategory}
      onLibraryClick={() => {
        if (section.kind === "category" && section.category !== "Template")
          handleLibraryClick(section.category);
      }}
      menu={
        isCategory ? (
          <>
            <SectionMenuItem
              icon={<Pencil size={14} />}
              label="Rename"
              onClick={() =>
                onRename?.((section as { category: PageCategory }).category)
              }
            />
            <SectionMenuItem
              icon={<EyeOff size={14} />}
              label="Hide section"
              onClick={() => onHide(section)}
            />
            <SectionMenuSeparator />
            <SectionMenuItem
              danger
              icon={<Trash2 size={14} />}
              label="Delete"
              onClick={() =>
                onDelete?.((section as { category: PageCategory }).category)
              }
            />
          </>
        ) : (
          <SectionMenuItem
            icon={<EyeOff size={14} />}
            label="Hide section"
            onClick={() => onHide(section)}
          />
        )
      }
    >
      {section.roots.map((node) => (
        <TreeRow
          key={node.page.id}
          node={node}
          depth={0}
          expandedIds={expandedIds}
          onToggleExpand={onToggleExpand}
          dropTarget={dropTarget}
          activeId={activeId}
        />
      ))}
      {section.roots.length === 0 && (
        <SectionEmpty section={section} onAddPage={onAddPage} />
      )}
    </Section>
  );
}

export function SidebarTree({
  tree,
  teamspaces,
  onMovePage,
  onAddPageToSection,
  onAddSection,
  onRenameSection,
  onDeleteSection,
  onHideSection,
}: SidebarTreeProps) {
  // Compose the ordered section list: Favorites, teamspaces…, Shared, Private.
  const sections = useMemo<SectionDesc[]>(() => {
    const cat = (category: PageCategory): SectionDesc => ({
      kind: "category",
      key: `cat:${category}`,
      category,
      label: category,
      roots: tree.byCategory[category] ?? [],
    });
    const ts = (t: Teamspace): SectionDesc => ({
      kind: "teamspace",
      key: `ts:${t.id}`,
      teamspaceId: t.id,
      label: t.name,
      icon: t.icon,
      roots: tree.byTeamspace[t.id] ?? [],
    });
    return [
      cat("Favorites"),
      ...teamspaces.map(ts),
      cat("Shared"),
      cat("Private"),
    ];
  }, [tree, teamspaces]);

  const sectionByKey = useMemo(() => {
    const m = new Map<string, SectionDesc>();
    for (const s of sections) m.set(s.key, s);
    return m;
  }, [sections]);

  const [activeId, setActiveId] = useState<ID | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const [expandedIds, setExpandedIds] = useState<Set<ID>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    () => {
      const keys = new Set<string>();
      for (const c of CATEGORY_SECTIONS)
        if ((tree.byCategory[c]?.length ?? 0) === 0) keys.add(`cat:${c}`);
      for (const t of teamspaces)
        if ((tree.byTeamspace[t.id]?.length ?? 0) === 0) keys.add(`ts:${t.id}`);
      return keys;
    },
  );

  // Flat node lookup across every section → O(1) drop-target resolution.
  const nodeById = useMemo(() => {
    const m = new Map<ID, PageTreeNode>();
    const walk = (nodes: PageTreeNode[]) => {
      for (const n of nodes) {
        m.set(n.page.id, n);
        if (n.children.length) walk(n.children);
      }
    };
    for (const s of sections) walk(s.roots);
    return m;
  }, [sections]);

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
    const overId = over.id;

    if (typeof overId === "string" && overId.startsWith("section:")) {
      setDropTarget({
        kind: "section",
        sectionKey: overId.slice("section:".length),
      });
      return;
    }
    if (typeof overId === "string" && overId.startsWith("section-header:")) {
      setDropTarget({
        kind: "section",
        sectionKey: overId.slice("section-header:".length),
      });
      return;
    }

    const overPageId = String(overId);
    const activePageId = String(active.id);

    const activeNode = nodeById.get(activePageId);
    if (activeNode) {
      const subtree = collectSubtreeIds(activeNode);
      if (subtree.has(overPageId)) {
        const overNode = nodeById.get(overPageId);
        if (overNode && overNode.page.parentId == null) {
          setDropTarget({
            kind: "section",
            sectionKey: keyOfRoot(overNode.page),
          });
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
    const pageId = String(e.active.id);
    setActiveId(null);
    setDropTarget(null);
    if (!target) return;

    if (target.kind === "section") {
      const section = sectionByKey.get(target.sectionKey);
      if (!section) return;
      onMovePage({
        pageId,
        newParentId: null,
        ...identityOfSection(section),
      });
      setCollapsedSections((s) => {
        if (!s.has(section.key)) return s;
        const n = new Set(s);
        n.delete(section.key);
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
          ...identityOfRoot(overPage),
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
        ...(isTopLevel ? identityOfRoot(overPage) : {}),
      });
    }
  };

  const onToggleExpand = (id: ID) =>
    setExpandedIds((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const onToggleCollapse = (key: string) =>
    setCollapsedSections((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  const handleHide = (section: SectionDesc) => {
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(section.key)) n.delete(section.key);
      else n.add(section.key);
      return n;
    });
    if (section.kind === "category") onHideSection?.(section.category);
  };

  const activeNode = activeId != null ? nodeById.get(activeId) : null;
  const visibleSections = sections.filter((s) => !hidden.has(s.key));

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
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {visibleSections.map((section) => (
          <TreeSection
            key={section.key}
            section={section}
            expandedIds={expandedIds}
            onToggleExpand={onToggleExpand}
            dropTarget={dropTarget}
            activeId={activeId}
            collapsed={collapsedSections.has(section.key)}
            onToggleCollapse={() => onToggleCollapse(section.key)}
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
        {activeNode ? (
          <div className="sidebar-drag-overlay">
            <PageItem page={activeNode.page} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
