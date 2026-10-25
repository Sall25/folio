import {
  ArrowLeft,
  ArrowUpDown,
  ArrowUpRight,
  Calendar,
  ChevronDown,
  Columns3,
  Database,
  GanttChart,
  LayoutGrid,
  List as ListIcon,
  ListFilter,
  Maximize2,
  Plus,
  Search,
  SlidersHorizontal,
  Table,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useActivePageState } from "src/features/pages/context/active-page-context";
import type { DatabaseView, SavedView, ID, DataSource } from "src/types";
import { PageItemIcon } from "src/features/pages/page-item/page-item-icon";
import { useDataSources } from "src/hooks/use-data-sources";
import { useCreateDataSource } from "src/hooks/use-create-data-source";
import { makeDataSource } from "src/utils/make-data-source";
import { usePages } from "src/hooks/use-pages";
import { newId } from "src/lib/id";
import { ViewPlaceholder } from "./view-placeholder";
import { makeDefaultView } from "../../utils";
import "./data-source-picker.scss";
import { Card } from "src/components/tiptap-ui-primitive/card";

const VIEW_ICON: Record<DatabaseView["type"], LucideIcon> = {
  table: Table,
  board: Columns3,
  gallery: LayoutGrid,
  list: ListIcon,
  calendar: Calendar,
  timeline: GanttChart,
};

/**
 * A database block that has no data source yet (just inserted from the slash
 * menu): the database itself, faded — title, view tab, toolbar and the
 * view's empty body — with the "New database" menu beside it. Click the
 * database or "New empty data source" to create it (the block keeps its
 * view, so a list stays a list), or link an existing one.
 */
export function DataSourcePicker({
  viewType,
  onSelect,
}: {
  /** The view the block was inserted as. */
  viewType: DatabaseView["type"];
  // savedView: when set, the caller should open a view of that layout on the
  // linked node (rather than the default).
  onSelect: (
    sourceId: ID,
    pageId?: ID,
    isLinked?: boolean,
    savedView?: SavedView,
  ) => void;
}) {
  const { t } = useTranslation();
  const { data: sources, isLoading } = useDataSources();
  const createDataSource = useCreateDataSource();
  const { activePageId } = useActivePageState();
  const { data: pages } = usePages();

  // menu: the two choices; link: the list of data sources; closed: × hides
  // the menu (clicking the preview brings it back).
  const [panel, setPanel] = useState<"menu" | "link" | "closed">("menu");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  // Only databases with a page of their own (a title): one made from a
  // block and never named is still just that block.
  const filtered = ((sources as DataSource[]) ?? []).filter(
    (s) =>
      s.pageId != null &&
      s.name?.toLowerCase().includes(query.trim().toLowerCase()),
  );

  // A new database is only a data source at first, held by this page: it
  // gets its own page when it's given a title (useDatabaseTitle).
  async function handleNew() {
    if (creating) return;
    setCreating(true);
    try {
      const source = makeDataSource({
        name: "",
        pageId: null,
        hostPageId: activePageId ?? null,
        sourceId: newId(),
        viewType,
      });
      await createDataSource.mutateAsync(source);

      // The view the block was inserted as, made with the new properties (a
      // board groups by its Status, a calendar uses its Date).
      onSelect(
        source.id,
        undefined,
        false,
        makeDefaultView(
          viewType,
          t(`database.views.${viewType}`),
          source.properties,
        ),
      );
    } finally {
      setCreating(false);
    }
  }

  const TabIcon = VIEW_ICON[viewType] ?? Table;

  return (
    <Card
      className="db-setup"
      data-view-type={viewType}
      aria-label={t(`database.picker.selectFor.${viewType}`)}
    >
      {/* The database as it will be — title, view tab, toolbar and the
          view's empty body — faded until it exists. Clicking it creates it. */}
      <div
        className="db-setup__preview"
        role="button"
        tabIndex={0}
        aria-label={t("database.picker.newEmpty")}
        aria-disabled={creating || undefined}
        onClick={() => void handleNew()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            void handleNew();
          }
        }}
      >
        <div className="db-setup__title">
          {t("database.picker.newDatabase")}
        </div>
        <div className="db-setup__toolbar" aria-hidden="true">
          <span className="db-setup__tab">
            <TabIcon size={16} />
            {t(`database.views.${viewType}`)}
          </span>
          <span className="db-setup__spacer" />
          <Search size={16} />
          <ListFilter size={16} />
          <ArrowUpDown size={16} />
          <Maximize2 size={14} />
          <SlidersHorizontal size={16} />
          <span className="db-setup__new">
            {t("database.toolbar.new")}
            <ChevronDown size={14} />
          </span>
        </div>
        <ViewPlaceholder type={viewType} />
      </div>

      {panel !== "closed" && (
        <div
          className="db-setup__menu"
          role="dialog"
          aria-label={t("database.picker.newDatabase")}
        >
          {panel === "menu" ? (
            <>
              <div className="db-setup__menu-head">
                <span className="db-setup__menu-title">
                  {t("database.picker.newDatabase")}
                </span>
                <button
                  type="button"
                  className="db-setup__close"
                  aria-label={t("actions.close")}
                  onClick={() => setPanel("closed")}
                >
                  <X size={14} />
                </button>
              </div>

              <button
                type="button"
                className="db-setup__item"
                disabled={creating}
                onClick={handleNew}
              >
                <span className="db-setup__item-tile" aria-hidden="true">
                  <Plus size={18} />
                </span>
                {t("database.picker.newEmpty")}
              </button>

              <div className="db-setup__divider" />

              <button
                type="button"
                className="db-setup__item"
                onClick={() => setPanel("link")}
              >
                <span className="db-setup__item-icon" aria-hidden="true">
                  <ArrowUpRight size={18} />
                </span>
                {t("database.picker.linkExisting")}
              </button>
            </>
          ) : (
            <>
              <div className="db-setup__menu-head">
                <button
                  type="button"
                  className="db-setup__close"
                  aria-label={t("database.picker.back")}
                  onClick={() => {
                    setPanel("menu");
                    setQuery("");
                  }}
                >
                  <ArrowLeft size={14} />
                </button>
                <span className="db-setup__menu-title">
                  {t("database.picker.linkExisting")}
                </span>
              </div>

              <input
                className="db-setup__search"
                placeholder={t("database.picker.searchSources")}
                aria-label={t("database.picker.searchSources")}
                value={query}
                autoFocus
                onChange={(e) => setQuery(e.target.value)}
              />

              <div className="db-setup__sources">
                {isLoading ? (
                  <span className="db-setup__hint">
                    {t("database.picker.loading")}
                  </span>
                ) : filtered.length === 0 ? (
                  <span className="db-setup__hint">
                    {t("database.picker.none")}
                  </span>
                ) : (
                  filtered.map((s) => {
                    const sourcePage = pages?.find((p) => p.id === s.pageId);
                    const saved = s.savedViews ?? [];
                    return (
                      <div key={s.id}>
                        <button
                          type="button"
                          className="db-setup__item db-setup__item--source"
                          onClick={() =>
                            onSelect(s.id, s.pageId ?? undefined, true)
                          }
                        >
                          <span
                            className="db-setup__item-icon"
                            aria-hidden="true"
                          >
                            {sourcePage ? (
                              <PageItemIcon
                                cover={sourcePage.cover}
                                styles={{ width: 16, height: 16 }}
                              />
                            ) : (
                              <Database size={16} />
                            )}
                          </span>
                          <span className="db-setup__item-text">{s.name}</span>
                        </button>
                        {saved.map((v) => {
                          const Icon = VIEW_ICON[v.type] ?? Database;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              className="db-setup__item db-setup__item--view"
                              onClick={() =>
                                onSelect(s.id, s.pageId ?? undefined, true, v)
                              }
                            >
                              <span
                                className="db-setup__item-icon"
                                aria-hidden="true"
                              >
                                <Icon size={14} />
                              </span>
                              <span className="db-setup__item-text">
                                {v.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
