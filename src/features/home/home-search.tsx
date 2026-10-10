import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Search } from "lucide-react";
import type { Page } from "src/types";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "src/components/tiptap-ui-primitive/popover";
import { PageItemIcon } from "../pages/page-item/page-item-icon";

const SEARCH_MAX = 6;

// Search or create, in the home toolbar. Filters the space's pages by title as
// you type; Enter opens the highlighted page, or creates a page with the typed
// title when that row is highlighted. The results open in a portalled popover:
// the toolbar scrolls sideways, which would clip a list positioned inside it.
export function HomeSearch({
  pages,
  onOpen,
  onCreate,
}: {
  pages: Page[];
  onOpen: (page: Page) => void;
  onCreate: (title: string) => void;
}) {
  const { t } = useTranslation();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
      q
        ? pages
            .filter((p) => (p.title || "").toLowerCase().includes(q))
            .slice(0, SEARCH_MAX)
        : [],
    [pages, q],
  );
  // The last row creates a page with the typed title.
  const rowCount = q ? matches.length + 1 : 0;
  const showList = open && rowCount > 0;
  const activeRow = Math.min(active, Math.max(rowCount - 1, 0));

  const choose = (index: number) => {
    if (index < matches.length) onOpen(matches[index]);
    else onCreate(query);
    setQuery("");
    setOpen(false);
  };

  return (
    <Popover open={showList} onOpenChange={(next) => !next && setOpen(false)}>
      <PopoverAnchor asChild>
        <label className="home-search home-search__box">
          <Search size={14} aria-hidden className="home-search__icon" />
          <span className="home-visually-hidden">{t("home.search.label")}</span>
          <input
            type="text"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              showList ? `${listId}-${activeRow}` : undefined
            }
            className="home-search__input"
            placeholder={t("home.search.short")}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={(e) => {
              if (!rowCount) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setOpen(true);
                setActive((activeRow + 1) % rowCount);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((activeRow - 1 + rowCount) % rowCount);
              } else if (e.key === "Enter") {
                e.preventDefault();
                choose(activeRow);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
          />
        </label>
      </PopoverAnchor>

      <PopoverContent
        align="end"
        sideOffset={6}
        className="home-search-list"
        // Focus stays in the input while the list is open.
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <ul id={listId} role="listbox" className="home-search-list__options">
          {matches.map((p, i) => (
            <li
              key={p.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === activeRow}
              className="home-search-list__option"
              // Keep focus in the input so the list stays open until chosen.
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(i)}
            >
              <PageItemIcon
                cover={p.cover}
                styles={{ width: 16, height: 16, fontSize: 16 }}
              />
              <span className="home-search-list__title">
                {p.title || t("page.untitled")}
              </span>
            </li>
          ))}
          <li
            id={`${listId}-${matches.length}`}
            role="option"
            aria-selected={activeRow === matches.length}
            className="home-search-list__option home-search-list__option--create"
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setActive(matches.length)}
            onClick={() => choose(matches.length)}
          >
            <Plus size={16} aria-hidden />
            <span className="home-search-list__title">
              {t("home.search.create", { title: query.trim() })}
            </span>
          </li>
        </ul>
      </PopoverContent>
    </Popover>
  );
}
