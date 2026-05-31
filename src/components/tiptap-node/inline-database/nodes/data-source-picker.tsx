import { FolderClosed, Plus, Database } from "lucide-react";
import { useState } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { usePages } from "src/components/tiptap-templates/simple/use-pages";
import { useActivePage } from "src/components/tiptap-templates/simple/use-active-page";
import { useDataSources } from "../hooks/use-data-sources";
import type { DatabaseProperty, ID } from "../types/types";
import "./data-source-picker.scss";

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
  onSelect: (sourceId: ID, pageId?: number) => void;
}) {
  const { sources, isLoading, createSourceAsync } = useDataSources();
  const { addPageAsync } = usePages();
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

      // 1. the database's own page — child of the active page
      const dbPage = await addPageAsync({
        title: name,
        parentId: activePageId ?? null,
        databaseId: sourceId,
      });

      // 2. the source, carrying its page link
      const source = await createSourceAsync({
        id: sourceId,
        name,
        pageId: dbPage.id,
        properties: defaultProperties(),
        records: [],
      });

      onSelect(source.id, dbPage.id);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="db-source-picker">
      <div className="db-source-picker__empty">
        <div className="db-source-picker__empty-icon">
          <FolderClosed size={28} />
        </div>
        <span className="db-source-picker__empty-title">No data source</span>
        <span className="db-source-picker__empty-sub">
          Select a data source to continue
        </span>
      </div>

      <div className="db-source-picker__panel">
        <Card style={{ padding: 8, minWidth: 260 }}>
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
            style={{ marginTop: 6, maxHeight: 240, overflowY: "auto" }}
          >
            {isLoading ? (
              <span className="db-source-picker__hint">Loading…</span>
            ) : filtered.length === 0 ? (
              <span className="db-source-picker__hint">No data sources</span>
            ) : (
              filtered.map((s) => (
                <Button
                  key={s.id}
                  variant="ghost"
                  style={{
                    justifyContent: "flex-start",
                    width: "100%",
                    gap: 8,
                  }}
                  onClick={() => onSelect(s.id, s.pageId)}
                >
                  <Database className="tiptap-button-icon" size={14} />
                  <span className="tiptap-button-text">{s.name}</span>
                </Button>
              ))
            )}
          </CardItemGroup>

          <div className="db-source-picker__footer">
            <Button
              variant="ghost"
              disabled={creating}
              style={{ justifyContent: "flex-start", width: "100%", gap: 8 }}
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
