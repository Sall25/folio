import { useMemo, useState } from "react";
import type { Editor } from "@tiptap/core";
import { useTranslation } from "react-i18next";
import { CornerUpRight, Search } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card } from "src/components/tiptap-ui-primitive/card";
import { NavigableMenuItem } from "src/features/database/components/navigable-menu-item";
import { PageItemIcon } from "src/features/pages/page-item/page-item-icon";
import { usePages } from "src/hooks/use-pages";
import { useSession } from "src/hooks/use-session";
import { useOptionalActivePage } from "src/features/pages/context/active-page-context";
import { useToast } from "src/features/shell/toast";
import {
  getBlocksToMove,
  moveBlocksToPage,
} from "src/features/editor/move-blocks/move-blocks";
import type { Page } from "src/types";
import "./move-to-dropdown.scss";

const MAX_RESULTS = 40;

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * "Move to" in the block menu: pick a page, the selected blocks go to the
 * end of it. Only in signed-in pages (it needs the page list and a session).
 * A row of the block menu whose page picker opens as a side flyout.
 */
export function MoveToDropdown({
  editor,
  onAction,
}: {
  editor: Editor;
  onAction?: () => void;
}) {
  const { t } = useTranslation();
  // Rendered only inside the app (the block menu checks for a page).
  const { activePageId } = useOptionalActivePage();
  const { session } = useSession();

  if (!activePageId || !session?.access_token) return null;

  return (
    <NavigableMenuItem
      Icon={CornerUpRight}
      label={t("moveTo.label")}
      side="right"
      align="start"
      sideOffset={8}
      collisionPadding={8}
      zIndex={10000}
    >
      <MoveToPanel editor={editor} onAction={onAction} />
    </NavigableMenuItem>
  );
}

/** The flyout: a search box and the pages. Mounted each time the flyout
 *  opens, so the search starts empty. */
function MoveToPanel({
  editor,
  onAction,
}: {
  editor: Editor;
  onAction?: () => void;
}) {
  const { t } = useTranslation();
  const { activePageId, setActivePageId } = useOptionalActivePage();
  const { session } = useSession();
  const { data: pages = [] } = usePages();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    return (pages as Page[])
      .filter(
        (p) => p.deletedAt == null && String(p.id) !== String(activePageId),
      )
      .filter((p) => !q || normalize(p.title || "").includes(q))
      .sort((a, b) => Number(b.updatedAt ?? 0) - Number(a.updatedAt ?? 0))
      .slice(0, MAX_RESULTS);
  }, [pages, query, activePageId]);

  const token = session?.access_token;

  const move = (page: Page) => {
    const range = getBlocksToMove(editor);
    onAction?.();
    if (!range || !token) return;
    const title = page.title || t("page.newPage");
    moveBlocksToPage({ editor, range, pageId: String(page.id), token })
      .then(() =>
        toast.show(t("moveTo.done", { title }), "success", {
          label: t("moveTo.open"),
          onClick: () => setActivePageId(page.id),
        }),
      )
      .catch((error: unknown) => {
        console.error("Move to page failed:", error);
        toast.show(t("moveTo.failed", { title }), "error");
      });
  };

  return (
    <Card className="move-to-card">
      <label className="move-to-search">
        <Search size={14} />
        <input
          // The flyout opens with the search ready for typing.
          autoFocus
          value={query}
          placeholder={t("moveTo.search")}
          aria-label={t("moveTo.search")}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            // Escape closes the flyout (the popover listens for it).
            if (e.key === "Escape") return;
            // Keep the menu's own letter navigation out of the search.
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
