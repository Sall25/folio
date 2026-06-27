import { Fragment, useState, type ReactNode } from "react";
import "./breadcrumb.scss";
import { usePages } from "src/hooks/use-pages";
import { PageItemIcon } from "src/components/tiptap-templates/simple/page-item-icon";

export interface BreadcrumbItem {
  id: string;
  title: string;
  icon?: ReactNode;
}

export interface BreadcrumbProps {
  /** crumbs ordered root → current */
  items: BreadcrumbItem[];
  /** called with a crumb id when a non-current crumb is clicked */
  onNavigate?: (id: string) => void;
  /** collapse the middle into "…" beyond this many crumbs (default 4; 0 disables) */
  maxItems?: number;
  /** separator between crumbs (default "/") */
  separator?: ReactNode;
  className?: string;
}

type Token =
  | { kind: "crumb"; item: BreadcrumbItem; current: boolean }
  | { kind: "ellipsis" };

export function Breadcrumb({
  items,
  onNavigate,
  maxItems = 4,
  separator = "/",
  className,
}: BreadcrumbProps) {
  const [expanded, setExpanded] = useState(false);
  const { data: pages } = usePages();

  if (items.length === 0) return null;

  const collapsed = !expanded && maxItems > 0 && items.length > maxItems;

  const tokens: Token[] = collapsed
    ? [
        { kind: "crumb", item: items[0], current: false },
        { kind: "ellipsis" },
        { kind: "crumb", item: items[items.length - 2], current: false },
        { kind: "crumb", item: items[items.length - 1], current: true },
      ]
    : items.map((item, i) => ({
        kind: "crumb",
        item,
        current: i === items.length - 1,
      }));

  return (
    <nav
      className={["breadcrumb", className].filter(Boolean).join(" ")}
      aria-label="Breadcrumb"
    >
      {tokens.map((token, i) => {
        const page = pages?.find(
          (p) => token.kind === "crumb" && p.id === token.item.id,
        );
        return (
          <Fragment
            key={token.kind === "crumb" ? token.item.id : `ellipsis-${i}`}
          >
            {i > 0 && (
              <span className="breadcrumb__sep" aria-hidden>
                {separator}
              </span>
            )}

            {token.kind === "ellipsis" ? (
              <button
                type="button"
                className="breadcrumb__item breadcrumb__ellipsis"
                aria-label="Show hidden pages"
                onClick={() => setExpanded(true)}
              >
                …
              </button>
            ) : token.current ? (
              <span
                className="breadcrumb__item breadcrumb__current"
                aria-current="page"
              >
                {token.item.icon && (
                  <span className="breadcrumb__icon">{token.item.icon}</span>
                )}
                {page && (
                  <PageItemIcon
                    cover={page.cover}
                    styles={{ width: 18, height: 18, fontSize: 16 }}
                  />
                )}
                <span className="breadcrumb__title">{token.item.title}</span>
              </span>
            ) : (
              <button
                type="button"
                className="breadcrumb__item"
                onClick={() => onNavigate?.(token.item.id)}
              >
                {token.item.icon && (
                  <span className="breadcrumb__icon">{token.item.icon}</span>
                )}
                {page && (
                  <PageItemIcon
                    cover={page.cover}
                    styles={{ width: 18, height: 18, fontSize: 16 }}
                  />
                )}
                <span className="breadcrumb__title">{token.item.title}</span>
              </button>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
