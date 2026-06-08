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
import { usePages } from "src/components/tiptap-templates/simple/use-pages";
import { useActivePage } from "src/components/tiptap-templates/simple/use-active-page";
import { useDataSources } from "../hooks/use-data-sources";
import type {
  DatabaseProperty,
  DatabaseView,
  SavedView,
  ID,
} from "../types/types";
import "./data-source-picker.scss";
import { databasePageContent } from "../hooks/use-create-database";
import { findPage } from "src/lib/find-page";
import { PageItemIcon } from "src/components/tiptap-templates/simple/page-item-icon";

const VIEW_ICON: Record<DatabaseView["type"], LucideIcon> = {
  table: Table,
  board: Columns3,
  gallery: LayoutGrid,
  list: ListIcon,
  calendar: Calendar,
  timeline: GanttChart,
};

function defaultProperties(): DatabaseProperty[] {
  return [
    {
      id: crypto.randomUUID(),
      name: "Name",
      config: { type: "title" },
      width: 240,
    },
    {
      id: crypto.randomUUID(),
      name: "Tags",
      config: { type: "select", options: [] },
      width: 160,
    },
  ];
}

export function DataSourcePicker({
  onSelect,
}: {
  // savedView: when set, the caller should open a view of that layout on the
  // linked node (rather than the default).
  onSelect: (
    sourceId: ID,
    pageId?: number,
    isLinked?: boolean,
    savedView?: SavedView,
  ) => void;
}) {
  const { sources, isLoading, createSourceAsync } = useDataSources();
  const { addPageAsync, pages } = usePages();
  const { activePageId } = useActivePage();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const filtered = (sources ?? []).filter((s) =>
    s.name?.toLowerCase().includes(query.trim().toLowerCase()),
  );
  async function handleNew() {
    setCreating(true);
    try {
      const sourceId = crypto.randomUUID();
      const name = query.trim() || "Untitled";

      const dbPage = await addPageAsync({
        title: name,
        parentId: activePageId ?? null,
        databaseId: sourceId,
        content: databasePageContent(sourceId, name),
      });

      const source = await createSourceAsync({
        id: sourceId,
        name,
        pageId: dbPage.id,
        properties: defaultProperties(),
        records: [],
      });

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
            boxShadow: "var(--tt-shadow-sm)",
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
                const sourcePage =
                  s.pageId != null && pages
                    ? (findPage(pages, s.pageId) ?? null)
                    : null;
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
