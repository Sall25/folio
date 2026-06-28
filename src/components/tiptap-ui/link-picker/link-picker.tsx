import { useMemo, useState } from "react";
import { X, ExternalLink } from "lucide-react";
import type { Page, PageTreeNode, PageCategory, ID } from "src/types";
import { usePageTree } from "src/hooks/use-pages";
import { PageItemIcon } from "src/components/tiptap-templates/simple/page-item-icon";
import "./link-picker.scss";

function useFlatPages(): Page[] {
  const { tree } = usePageTree();
  return useMemo(() => {
    const out: Page[] = [];
    if (!tree) return out;
    const walk = (nodes: PageTreeNode[]) => {
      for (const n of nodes) {
        out.push(n.page);
        walk(n.children);
      }
    };
    (Object.keys(tree) as PageCategory[]).forEach((c) => walk(tree[c] ?? []));
    return out;
  }, [tree]);
}

const looksLikeUrl = (s: string) => /^(https?:\/\/|www\.)/i.test(s.trim());
const normalizeUrl = (s: string) => {
  const t = s.trim();
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
};

export function LinkPicker({
  href,
  onChange,
  onClose,
}: {
  href: string | null;
  onChange: (href: string | null) => void;
  /** called after a choice — pass to close the popover on select */
  onClose?: () => void;
}) {
  const pages = useFlatPages();
  const [query, setQuery] = useState("");

  const current = href ? pages.find((p) => p.id === (href as ID)) : undefined;
  const url = looksLikeUrl(query);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? pages.filter((p) => (p.title || "").toLowerCase().includes(q))
      : pages;
    return list.slice(0, 8);
  }, [pages, query]);

  const pick = (value: string | null) => {
    onChange(value);
    onClose?.();
  };

  return (
    <div className="link-picker" contentEditable={false}>
      <input
        className="link-picker__input"
        placeholder="Search a page or paste a URL"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      {href && (
        <div className="link-picker__current">
          <span className="link-picker__current-label">
            {current ? current.title || "Untitled" : href}
          </span>
          <button
            type="button"
            className="link-picker__clear"
            aria-label="Remove link"
            onClick={() => pick(null)}
          >
            <X size={13} />
          </button>
        </div>
      )}

      <div className="link-picker__list">
        {url ? (
          <button
            type="button"
            className="link-picker__item"
            onClick={() => pick(normalizeUrl(query))}
          >
            <span className="link-picker__item-icon">
              <ExternalLink size={15} />
            </span>
            <span className="link-picker__item-label">
              Link to {query.trim()}
            </span>
          </button>
        ) : results.length === 0 ? (
          <div className="link-picker__empty">No pages found</div>
        ) : (
          results.map((p) => (
            <button
              key={p.id}
              type="button"
              className="link-picker__item"
              onClick={() => pick(p.id)}
            >
              <span className="link-picker__item-icon">
                <PageItemIcon cover={p.cover} />
              </span>
              <span className="link-picker__item-label">
                {p.title || "Untitled"}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
