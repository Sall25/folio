import {
  FolderClosed,
  Plus,
  Database,
  Table,
  Columns3,
  LayoutGrid,
  List as ListIcon,
  Calendar,
  GanttChart,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { useActivePageState } from "src/components/tiptap-templates/simple/context/active-page-context";
import type { DatabaseView, SavedView, ID, DataSource } from "src/types";
import "./data-source-picker.scss";
import { PageItemIcon } from "src/components/tiptap-templates/simple/page-item-icon";
import { useDataSources } from "src/hooks/use-data-sources";
import { useCreateDataSource } from "src/hooks/use-create-data-source";
import { makeDataSource } from "src/utils/make-data-source";
import { makeDatabasePage } from "src/utils/make-page";
import { useCreatePage } from "src/hooks/use-create-page";
import { usePages } from "src/hooks/use-pages";
import { newId } from "src/lib/id";
import { useCurrentPerson } from "src/hooks/use-session";

const VIEW_ICON: Record<DatabaseView["type"], LucideIcon> = {
  table: Table,
  board: Columns3,
  gallery: LayoutGrid,
  list: ListIcon,
  calendar: Calendar,
  timeline: GanttChart,
};

export function DataSourcePicker({
  onSelect,
}: {
  // savedView: when set, the caller should open a view of that layout on the
  // linked node (rather than the default).
  onSelect: (
    sourceId: ID,
    pageId?: ID,
    isLinked?: boolean,
    savedView?: SavedView,
  ) => void;
}) {
  const { data: sources, isLoading } = useDataSources();
  const createPage = useCreatePage();
  const createDataSource = useCreateDataSource();
  const { activePageId, activePage } = useActivePageState();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const { data: pages } = usePages();
  const { person } = useCurrentPerson();

  const filtered = ((sources as DataSource[]) ?? []).filter((s) =>
    s.name?.toLowerCase().includes(query.trim().toLowerCase()),
  );
  async function handleNew() {
    setCreating(true);
    try {
      const sourceId = newId();
      const name = query.trim() || "New Database";
      if (!person) return;

      const dbPage = makeDatabasePage({
        sourceId,
        name,
        parentId: activePageId,
        category: activePage?.category,
        ownerId: person.id,
      });
      const source = makeDataSource({ name, pageId: dbPage.id, sourceId });

      await createPage.mutateAsync(dbPage);
      await createDataSource.mutateAsync(source);

      onSelect(source.id, dbPage.id, false);
    } finally {
      setCreating(false);
    }
  }
  return (
    <div className="db-source-picker">
      <div className="db-source-picker__empty">
        <div className="db-source-picker__empty-icon">
          <FolderClosed size={46} />
        </div>
        <span className="db-source-picker__empty-title">No data source</span>
        <span className="db-source-picker__empty-sub">
          Select a data source to continue
        </span>
      </div>

      <div className="db-source-picker__panel">
        <Card
          style={{
            padding: 8,
            minWidth: 260,
            border: "1px solid var(--tt-border-color)",
            borderRadius: "var(--tt-radius-sm)",
            boxShadow: "var(--tt-shadow-md)",
          }}
        >
          <input
            className="db-source-picker__search"
            placeholder="Link or create a database…"
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filtered.length === 0) handleNew();
            }}
          />

          <CardItemGroup
            style={{
              marginTop: 6,
              maxHeight: 240,
              overflowY: "auto",
              justifyContent: "flex-start",
              width: "100%",
            }}
          >
            {isLoading ? (
              <span className="db-source-picker__hint">Loading…</span>
            ) : filtered.length === 0 ? (
              <span className="db-source-picker__hint">No data sources</span>
            ) : (
              filtered.map((s) => {
                const sourcePage = pages?.find((p) => p.id === s.pageId);
                const saved = s.savedViews ?? [];
                return (
                  <div key={s.id} className="db-source-picker__source">
                    <Button
                      variant="ghost"
                      style={{
                        justifyContent: "flex-start",
                        width: "100%",
                        gap: 8,
                        borderRadius: "var(--tt-radius-sm)",
                      }}
                      onClick={() => onSelect(s.id, s.pageId, true)}
                    >
                      {sourcePage ? (
                        <PageItemIcon
                          cover={sourcePage.cover}
                          styles={{ width: 16, height: 16 }}
                        />
                      ) : (
                        <Database className="tiptap-button-icon" size={14} />
                      )}
                      <span className="tiptap-button-text">{s.name}</span>
                    </Button>

                    {saved.length > 0 && (
                      <div className="db-source-picker__views">
                        {saved.map((v) => {
                          const Icon = VIEW_ICON[v.type] ?? Database;
                          return (
                            <Button
                              key={v.id}
                              variant="ghost"
                              className="db-source-picker__view"
                              style={{
                                justifyContent: "flex-start",
                                width: "100%",
                                gap: 8,
                                paddingLeft: 26,
                                borderRadius: "var(--tt-radius-sm)",
                              }}
                              onClick={() => onSelect(s.id, s.pageId, true, v)}
                            >
                              <Icon className="tiptap-button-icon" size={13} />
                              <span className="tiptap-button-text">
                                {v.name}
                              </span>
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardItemGroup>

          <div
            className="db-source-picker__footer"
            style={{
              display: "flex",
              justifyContent: "flex-start",
              width: "100%",
            }}
          >
            <Button
              variant="ghost"
              disabled={creating}
              style={{
                justifyContent: "flex-start",
                width: "100%",
                gap: 8,
                borderRadius: "var(--tt-radius-sm)",
              }}
              onClick={handleNew}
            >
              <Plus className="tiptap-button-icon" size={14} />
              <span className="tiptap-button-text">New database</span>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
