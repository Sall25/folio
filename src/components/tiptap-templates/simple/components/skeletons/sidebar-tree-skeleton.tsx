import { Bone } from "src/components/tiptap-ui-primitive/bone";
import { useTranslation } from "react-i18next";
import type { PageCategory } from "src/types";
import {
  DEFAULT_SECTION_ORDER,
  useSectionOrder,
} from "../../hooks/use-sidebar-order";
import "./sidebar-tree-skeleton.scss";

/**
 * The sidebar's loading state.
 *
 * The section SET is fixed and their ORDER is local (localStorage, via
 * useSectionOrder) — neither waits on the page fetch. So the real headers render
 * immediately, in the user's real order, and only the page rows are bones. The
 * headers therefore don't move when the data lands: the skeleton resolves into
 * the tree rather than being replaced by it.
 *
 * The row geometry is copied from PageItem deliberately — 28.5px tall, 6px left
 * pad, a 15px icon, 4px gap — because a skeleton whose rows are a different
 * height than the real ones produces a visible jolt at exactly the moment you're
 * trying to hide one.
 */

const CATEGORY_TRANSLATION_MAP: Record<PageCategory, string> = {
  Favorites: "section.favorites",
  Shared: "section.shared",
  Private: "section.private",
  Template: "section.template",
  Teamspaces: "section.teamspaces",
};

// Modest and uniform. Varying the count per section only looks arbitrary — the
// skeleton has no idea how many pages a section holds, and pretending otherwise
// is a lie the reader can't act on.
const ROWS_PER_SECTION = 4;

// Deterministic widths so rows don't reshuffle on re-render, and irregular
// enough to read as text rather than a progress bar.
const TITLE_WIDTHS = ["62%", "48%", "74%", "55%", "68%", "42%"];

function PageRowSkeleton({ index }: { index: number }) {
  return (
    <div className="sidebar-tree-skeleton__row">
      <Bone width={13} height={13} rounded />
      <Bone
        width={TITLE_WIDTHS[index % TITLE_WIDTHS.length]}
        height={10}
        pill
      />
    </div>
  );
}

function SectionSkeleton({ category }: { category: PageCategory }) {
  const { t } = useTranslation();

  return (
    <div className="sidebar-tree-skeleton__section">
      {/* The REAL header — label, order and all. It's local state, so it's ready
          now, and rendering it means it won't jump when the pages arrive. */}
      <div className="sidebar-section__header">
        <span className="sidebar-section__label">
          {t(CATEGORY_TRANSLATION_MAP[category]) ?? category}
        </span>
      </div>

      <div className="sidebar-tree-skeleton__rows">
        {Array.from({ length: ROWS_PER_SECTION }).map((_, i) => (
          <PageRowSkeleton key={i} index={i} />
        ))}
      </div>
    </div>
  );
}

export function SidebarTreeSkeleton() {
  // The user's own section order, straight from localStorage — no fetch needed.
  const [sectionOrder] = useSectionOrder();
  const categories = sectionOrder?.length
    ? sectionOrder
    : DEFAULT_SECTION_ORDER;

  return (
    <div
      className="sidebar-tree-skeleton"
      role="presentation"
      aria-hidden="true"
    >
      {categories.map((category) => (
        <SectionSkeleton key={category} category={category} />
      ))}
    </div>
  );
}
