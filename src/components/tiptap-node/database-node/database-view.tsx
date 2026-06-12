import React, { useCallback, useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import type { DatabaseAttrs, DatabaseRow, Property } from "./types";
import { useDatabase } from "./use-database";
import { FilterPanel, GroupPanel, PropertiesPanel, SortPanel } from "./panels";
import "./database-view.scss";

type Panel = "filter" | "sort" | "group" | "props" | null;

// ─── cell renderers ────────────────────────────────────────────────────────
function CellValue({
  prop,
  value,
  row,
  onUpdate,
}: {
  prop: Property;
  value: string | number | boolean;
  row: DatabaseRow;
  onUpdate: (id: string, prop: string, val: string) => void;
}) {
  if (prop.type === "select") {
    const opt = prop.options?.find((o) => o.label === value);
    return (
      <select
        className="db-cell-select"
        value={String(value)}
        onChange={(e) => onUpdate(row.id, prop.id, e.target.value)}
        style={
          { "--tag-bg": opt?.color ?? "transparent" } as React.CSSProperties
        }
      >
        {prop.options?.map((o) => (
          <option key={o.label} value={o.label}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  if (prop.type === "checkbox") {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onUpdate(row.id, prop.id, String(e.target.checked))}
        className="db-cell-checkbox"
      />
    );
  }

  if (prop.type === "date") {
    return (
      <input
        type="date"
        className="db-cell-date"
        value={String(value ?? "")}
        onChange={(e) => onUpdate(row.id, prop.id, e.target.value)}
      />
    );
  }

  if (prop.type === "number") {
    return (
      <input
        type="number"
        className="db-cell-input"
        value={String(value ?? "")}
        onChange={(e) => onUpdate(row.id, prop.id, e.target.value)}
      />
    );
  }

  // text / url / fallback
  return (
    <input
      type={prop.type === "url" ? "url" : "text"}
      className="db-cell-input"
      value={String(value ?? "")}
      onChange={(e) => onUpdate(row.id, prop.id, e.target.value)}
    />
  );
}

// ─── main component ────────────────────────────────────────────────────────

export function DatabaseView({
  node,
  updateAttributes,
  selected,
}: NodeViewProps) {
  const attrs = node.attrs as DatabaseAttrs;
  const [activePanel, setActivePanel] = useState<Panel>(null);

  const onUpdate = useCallback(
    (patch: Partial<DatabaseAttrs>) => updateAttributes(patch),
    [updateAttributes],
  );

  const db = useDatabase({ attrs, onUpdate });
  const visProps = attrs.properties.filter((p) => p.visible);

  const togglePanel = (name: Panel) =>
    setActivePanel((prev) => (prev === name ? null : name));

  const sortIcon = (propId: string) => {
    const s = attrs.sorts.find((x) => x.prop === propId);
    if (!s) return <span className="db-sort-icon">↕</span>;
    return (
      <span className="db-sort-icon db-sort-icon--active">
        {s.dir === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  return (
    <NodeViewWrapper
      className={`db-node-wrapper ${selected ? "db-node-wrapper--selected" : ""}`}
      data-drag-handle
    >
      {/* ── header ── */}
      <div className="db-header">
        <span className="db-header-icon">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <rect
              x="1"
              y="1"
              width="14"
              height="4"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <rect
              x="1"
              y="7"
              width="14"
              height="4"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <rect
              x="1"
              y="13"
              width="6"
              height="2"
              rx="1"
              fill="currentColor"
              opacity=".5"
            />
          </svg>
        </span>
        <input
          className="db-title"
          value={attrs.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
        />
        <span className="db-row-count">{db.processed.length} rows</span>
      </div>

      {/* ── toolbar ── */}
      <div className="db-toolbar">
        <button
          className={`db-chip ${activePanel === "filter" ? "db-chip--active" : ""}`}
          onClick={() => togglePanel("filter")}
        >
          Filter
          {attrs.filters.length > 0 && (
            <span className="db-badge">{attrs.filters.length}</span>
          )}
        </button>
        <button
          className={`db-chip ${activePanel === "sort" ? "db-chip--active" : ""}`}
          onClick={() => togglePanel("sort")}
        >
          Sort
          {attrs.sorts.length > 0 && (
            <span className="db-badge">{attrs.sorts.length}</span>
          )}
        </button>
        <button
          className={`db-chip ${activePanel === "group" ? "db-chip--active" : ""}`}
          onClick={() => togglePanel("group")}
        >
          Group{attrs.groupBy && <span className="db-badge">1</span>}
        </button>
        <button
          className={`db-chip ${activePanel === "props" ? "db-chip--active" : ""}`}
          onClick={() => togglePanel("props")}
        >
          Properties
        </button>
        <div className="db-toolbar-spacer" />
        <input
          className="db-search"
          placeholder="Search…"
          value={db.search}
          onChange={(e) => db.setSearch(e.target.value)}
        />
        <button className="db-chip db-chip--primary" onClick={db.addRow}>
          + New
        </button>
      </div>

      {/* ── panels ── */}
      {activePanel === "filter" && (
        <FilterPanel
          filters={attrs.filters}
          properties={attrs.properties}
          onAdd={db.addFilter}
          onUpdate={db.updateFilter}
          onRemove={db.removeFilter}
        />
      )}
      {activePanel === "sort" && (
        <SortPanel
          sorts={attrs.sorts}
          properties={attrs.properties}
          onAdd={db.addSort}
          onUpdate={db.updateSort}
          onRemove={db.removeSort}
        />
      )}
      {activePanel === "group" && (
        <GroupPanel
          groupBy={attrs.groupBy}
          properties={attrs.properties}
          onChange={db.setGroupBy}
        />
      )}
      {activePanel === "props" && (
        <PropertiesPanel
          properties={attrs.properties}
          onToggle={db.togglePropertyVisible}
        />
      )}

      {/* ── table ── */}
      <div className="db-table-scroll">
        <table className="db-table">
          <thead>
            <tr>
              <th className="db-th db-th--drag" />
              {visProps.map((p) => (
                <th
                  key={p.id}
                  className={`db-th ${attrs.sorts.some((s) => s.prop === p.id) ? "db-th--sorted" : ""}`}
                  style={{ width: p.width }}
                  onClick={() => db.toggleSort(p.id)}
                >
                  {p.label}
                  {sortIcon(p.id)}
                </th>
              ))}
              <th className="db-th db-th--action" />
            </tr>
          </thead>

          <tbody>
            {Object.entries(db.grouped).map(([groupKey, group]) => (
              <React.Fragment key={groupKey}>
                {attrs.groupBy && (
                  <tr
                    className="db-group-row"
                    onClick={() => db.toggleGroup(groupKey)}
                  >
                    <td colSpan={visProps.length + 2}>
                      <span className="db-group-chevron">
                        {db.collapsedGroups[groupKey] ? "▶" : "▼"}
                      </span>
                      {group.label}
                      <span className="db-group-count">
                        {group.rows.length}
                      </span>
                    </td>
                  </tr>
                )}
                {!db.collapsedGroups[groupKey] &&
                  group.rows.map((row) => (
                    <tr key={row.id} className="db-row">
                      <td className="db-td db-td--drag">⠿</td>
                      {visProps.map((p) => (
                        <td key={p.id} className="db-td">
                          <CellValue
                            prop={p}
                            value={row[p.id]}
                            row={row}
                            onUpdate={db.updateRow}
                            
                          />
                        </td>
                      ))}
                      <td className="db-td db-td--action">
                        <button
                          className="db-delete-btn"
                          onClick={() => db.deleteRow(row.id)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="db-add-row" onClick={db.addRow}>
        + Add row
      </div>

      <div className="db-footer">
        <span>
          {attrs.rows.length} total · {db.processed.length} shown
        </span>
      </div>
    </NodeViewWrapper>
  );
}
