import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { PageItemIcon } from "src/components/tiptap-templates/simple/page-item-icon";
import type { PageCover, CellValue, ID, RelationValue } from "src/types";
import { useDataSource } from "../../../hooks/use-data-source";
import { useRows } from "src/hooks/use-pages";
import type { CellProps } from "../types";
import "./relation-cell.scss";
import { usePageView } from "src/components/tiptap-templates/simple/context/page-view-context";

// Tolerates BOTH shapes: string[] (bare ids) and RelationValue[] ({ pageId }).
function relationRecordIds(raw: unknown): ID[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) =>
      typeof item === "string"
        ? item
        : item && typeof item === "object" && "pageId" in item
          ? String((item as RelationValue).pageId)
          : null,
    )
    .filter((x): x is string => !!x);
}

// A row IS a page, so its display name is page.title — the single source of
// truth after the title-cell fix. Reading the title out of
// values[titlePropId] (as this cell used to) yields null, which is why every
// chip and picker row showed "Untitled".
function rowLabel(row: { title?: string | null }): string {
  return (typeof row.title === "string" && row.title.trim()) || "Untitled";
}

/**
 * Relation cell.
 *
 * Origin side (stored): value is the linked target row ids; editable.
 * Mirror side (derived): when this property is the synced counterpart
 * (mirrorPropertyId set + showOnTarget false), its links are COMPUTED by
 * scanning the target source's rows whose synced relation points back at
 * this row. Read-only.
 *
 * Post-collapse: a row IS a page, so a linked id is directly the page id —
 * no record→page lookup.
 */
export function RelationCell({
  value,
  config,
  onChange,
  readonly,
  unwrapped,
  recordId,
  className
}: CellProps<"relation"> & { recordId?: ID }) {
  // Called for its side effect: ensures the target source is loaded. Its
  // schema is no longer read here (titles come off the rows directly).
  useDataSource(config.targetSourceId || null);
  const { setTarget } = usePageView();
  const { data: targetRows } = useRows(config.targetSourceId || "");
  const rows = useMemo(() => targetRows ?? [], [targetRows]);
  const [query, setQuery] = useState("");

  const isMirror = !!config.mirrorPropertyId && !config.showOnTarget;
  const effectiveReadonly = readonly || isMirror;

  // Linked ids: derived for the mirror, stored for the origin.
  const ids = useMemo(() => {
    if (isMirror) {
      if (!config.mirrorPropertyId || !recordId) return [];
      return rows
        .filter((r) =>
          relationRecordIds(r.values?.[config.mirrorPropertyId as ID]).includes(
            recordId,
          ),
        )
        .map((r) => r.id);
    }
    return relationRecordIds(value);
  }, [isMirror, rows, config.mirrorPropertyId, recordId, value]);

  const rowById = (id: string) => rows.find((r) => r.id === id);

  const labelOf = (id: string): string => {
    const row = rowById(id);
    return row ? rowLabel(row) : "Untitled";
  };

  // a linked id IS the page id (row = page) — cover comes straight off the row
  const coverOf = (id: string): PageCover | null => rowById(id)?.cover ?? null;

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => rowLabel(r).toLowerCase().includes(q));
  }, [rows, query]);

  const commit = (next: string[]) =>
    onChange?.(next as unknown as CellValue<"relation"> | null);

  const toggle = (id: string) =>
    commit(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);

  const remove = (id: string) => commit(ids.filter((x) => x !== id));

  // linked id is the page id — open it directly
  const openPeek = (id: string) => setTarget({ pageId: id, view: "Peek" });

  // ── Chips ───────────────────────────────────────────────────────────────
  const chip = (id: string) => {
    const cover = coverOf(id);
    return (
      <span
        key={id}
        className="db-relation-chip"
        onClick={(e) => {
          e.stopPropagation();
          openPeek(id);
        }}
      >
        {cover && (
          <PageItemIcon cover={cover} styles={{ width: 14, height: 14 }} />
        )}
        <span className="db-relation-chip__label">{labelOf(id)}</span>
        {!effectiveReadonly && (
          <button
            type="button"
            className="db-relation-chip__remove"
            aria-label="Remove"
            onClick={(e) => {
              e.stopPropagation();
              remove(id);
            }}
          >
            <X size={11} />
          </button>
        )}
      </span>
    );
  };

  const trigger = (
    <div
      className={className}
      data-wrap={unwrapped ? "false" : "true"}
      style={{
        display: "flex",
        alignItems: unwrapped ? "center" : "flex-start",
        gap: 4,
        flex: 1,
        minHeight: 34,
        flexWrap: unwrapped ? "nowrap" : "wrap",
        overflow: "hidden",
        padding: unwrapped ? 0 : "7px 0",
        cursor: effectiveReadonly ? "default" : "pointer",
      }}
    >
      {ids.length > 0 ? (
        ids.map((id) => chip(id))
      ) : (
        <span style={{ opacity: 0 }}>_</span>
      )}
    </div>
  );

  // Mirror / readonly: just the chips, no picker.
  if (effectiveReadonly || !onChange) return trigger;

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent side="bottom" align="start">
        <Card style={{ padding: "5px 10px", minWidth: 240 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 6px",
              borderRadius: "var(--tt-radius-sm)",
              background: "var(--tt-bg-subtle, rgba(0,0,0,0.04))",
              margin: "2px 0 6px",
            }}
          >
            <Search size={13} style={{ opacity: 0.6 }} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                config.targetSourceId
                  ? "Search records…"
                  : "No related database set"
              }
              disabled={!config.targetSourceId}
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                width: "100%",
                fontSize: 13,
                color: "var(--tt-text-primary)",
                fontFamily: "inherit",
              }}
            />
          </div>

          <CardItemGroup
            style={{
              maxHeight: 240,
              overflowY: "auto",
              width: "100%",
              justifyContent: "flex-start",
            }}
          >
            {!config.targetSourceId ? (
              <span style={{ fontSize: 12, color: "var(--tt-text-secondary)" }}>
                Set a related database in the property settings.
              </span>
            ) : candidates.length === 0 ? (
              <span style={{ fontSize: 12, color: "var(--tt-text-secondary)" }}>
                No records
              </span>
            ) : (
              candidates.map((row) => {
                const selected = ids.includes(row.id);
                const label = rowLabel(row);
                const cover = coverOf(row.id);
                return (
                  <Button
                    key={row.id}
                    variant="ghost"
                    onClick={() => toggle(row.id)}
                    style={{
                      justifyContent: "flex-start",
                      width: "100%",
                      fontWeight: 500,
                      fontSize: 14,
                      color: "var(--tt-theme-text)",
                      gap: 8,
                      borderRadius: "var(--tt-radius-sm)",
                    }}
                  >
                    {cover && (
                      <PageItemIcon
                        cover={cover}
                        styles={{ width: 16, height: 16 }}
                      />
                    )}
                    <span className="tiptap-button-text">{label}</span>
                    {selected && (
                      <Check
                        size={14}
                        style={{
                          marginLeft: "auto",
                          color: "var(--tt-brand-color-400)",
                        }}
                      />
                    )}
                  </Button>
                );
              })
            )}
          </CardItemGroup>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
