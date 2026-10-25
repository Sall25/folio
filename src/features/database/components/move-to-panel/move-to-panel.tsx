// ─── Move to (destination picker) ───────────────────────────────────────────
// Where a record's page can be moved: a search box and the pages, most
// recently edited first. Same look and keys as the block menu's Move to
// (↑ ↓ to pick, Enter to move, Escape to close), and its styles.
//
// The record and its own subpages aren't offered (a page can't go inside
// itself), nor the trash or templates. After the move, a toast names the
// destination with a link to open it.
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "src/components/icons";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card } from "src/components/tiptap-ui-primitive/card";
import { PageItemIcon } from "src/features/pages/page-item/page-item-icon";
import { useOptionalActivePage } from "src/features/pages/context/active-page-context";
import { useToast } from "src/features/shell/toast";
import { usePages } from "src/hooks/use-pages";
import type { ID, Page } from "src/types";
import "src/components/tiptap-ui/move-to-dropdown/move-to-dropdown.scss";

const MAX_RESULTS = 40;

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

interface MoveToPanelProps {
  /** The record's page — the thing being moved (excluded from destinations,
   *  along with its own descendants). */
  currentPageId: ID;
  /** Perform the move. newParentId null = move to a top-level section. */
  onMove: (newParentId: ID | null, category?: string) => void;
  /** Close without moving. */
  onBack: () => void;
  spaceName?: string;
}

// Collect a page and all of its descendants — a page can't be moved into its
// own subtree, so these are excluded from the destination list.
function collectSubtreeIds(rootId: ID, pages: Page[]): Set<ID> {
  const childrenOf = new Map<ID | null, Page[]>();
  for (const p of pages) {
    const key = (p.parentId ?? null) as ID | null;
    const arr = childrenOf.get(key) ?? [];
    arr.push(p);
    childrenOf.set(key, arr);
  }
  const ids = new Set<ID>([rootId]);
  const stack: ID[] = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    for (const child of childrenOf.get(id) ?? []) {
      if (!ids.has(child.id)) {
        ids.add(child.id);
        stack.push(child.id);
      }
    }
  }
  return ids;
}

export function MoveToPanel({
  currentPageId,
  onMove,
  onBack,
}: MoveToPanelProps) {
  const { t } = useTranslation();
  const { data: pages } = usePages();
  const { setActivePageId } = useOptionalActivePage();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const excluded = useMemo(
    () => collectSubtreeIds(currentPageId, pages ?? []),
    [currentPageId, pages],
  );

  const results = useMemo(() => {
    const q = normalize(query.trim());
    return (pages ?? [])
      .filter((p) => !excluded.has(p.id))
      .filter((p) => p.deletedAt == null && p.category !== "Template")
      .filter((p) => !q || normalize(p.title || "").includes(q))
      .sort((a, b) => Number(b.updatedAt ?? 0) - Number(a.updatedAt ?? 0))
      .slice(0, MAX_RESULTS);
  }, [pages, excluded, query]);

  const move = (page: Page) => {
    onMove(page.id, page.category);
    const title = page.title || t("page.newPage");
    toast.show(t("moveTo.done", { title }), "success", {
      label: t("moveTo.open"),
      onClick: () => setActivePageId(page.id),
    });
  };

  return (
    <Card className="move-to-card">
      <label className="move-to-search">
        <Search size={14} />
        <input
          autoFocus
          value={query}
          placeholder={t("moveTo.search")}
          aria-label={t("moveTo.search")}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onBack();
              return;
            }
            e.stopPropagation();
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(results.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (results[active]) move(results[active]);
            }
          }}
        />
      </label>
      <div className="move-to-list" role="listbox">
        {results.length === 0 && (
          <div className="move-to-empty">{t("moveTo.none")}</div>
        )}
        {results.map((page, i) => (
          <Button
            key={page.id}
            type="button"
            variant="ghost"
            role="option"
            aria-selected={i === active}
            data-highlighted={i === active}
            className="move-to-item"
            onMouseEnter={() => setActive(i)}
            onClick={() => move(page)}
          >
            <PageItemIcon cover={page.cover} styles={{ fontSize: 14 }} />
            <span className="tiptap-button-text">
              {page.title || t("page.newPage")}
            </span>
          </Button>
        ))}
      </div>
    </Card>
  );
}
