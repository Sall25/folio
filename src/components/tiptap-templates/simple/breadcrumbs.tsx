import { Fragment } from "react";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import type { Page, ID } from "src/types";
import { useBreadcrumbs } from "src/hooks/use-pages";
import { useActivePage } from "src/components/tiptap-templates/simple/context/active-page-context";
import { PageItemIcon } from "src/components/tiptap-templates/simple/page-item-icon";
import "./breadcrumbs.scss";

// how many crumbs before we collapse the middle
const MAX_VISIBLE = 4;

export function Breadcrumbs({ pageId }: { pageId: ID | null }) {
  const { data: chain } = useBreadcrumbs(pageId);
  const { setActivePageId } = useActivePage();

  if (!chain || chain.length === 0) return null;

  // decide which crumbs to show: collapse the middle if too long.
  // always keep the first (root) and the last two (parent + current).
  const collapsed = chain.length > MAX_VISIBLE;
  const visible = collapsed
    ? [chain[0], ...chain.slice(chain.length - 2)]
    : chain;

  // index in `visible` where the ellipsis goes (after the root) when collapsed
  const ellipsisAfter = collapsed ? 0 : -1;

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {visible.map((page, i) => {
        const isLast = i === visible.length - 1;
        return (
          <Fragment key={page.id}>
            <Crumb
              page={page}
              isLast={isLast}
              onClick={isLast ? undefined : () => setActivePageId(page.id)}
            />
            {/* separator + optional ellipsis */}
            {!isLast && <ChevronRight size={14} className="breadcrumbs__sep" />}
            {i === ellipsisAfter && (
              <>
                <span
                  className="breadcrumbs__ellipsis"
                  aria-label="Hidden pages"
                >
                  <MoreHorizontal size={14} />
                </span>
                <ChevronRight size={14} className="breadcrumbs__sep" />
              </>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

function Crumb({
  page,
  isLast,
  onClick,
}: {
  page: Page;
  isLast: boolean;
  onClick?: () => void;
}) {
  const label = page.title || "Untitled";

  const content = (
    <>
      <PageItemIcon cover={page.cover} styles={{ width: 16, height: 16 }} />
      <span className="breadcrumbs__label">{label}</span>
    </>
  );

  if (isLast || !onClick) {
    // current page — not a link
    return (
      <span
        className="breadcrumbs__crumb breadcrumbs__crumb--current"
        aria-current="page"
      >
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      className="breadcrumbs__crumb breadcrumbs__crumb--link"
      onClick={onClick}
    >
      {content}
    </button>
  );
}
