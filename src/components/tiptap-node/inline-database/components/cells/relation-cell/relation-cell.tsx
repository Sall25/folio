import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { usePeekPage } from "src/components/tiptap-templates/simple/context/peek-page-context";
import { usePages } from "src/components/tiptap-templates/simple/use-pages";
import { PageItemIcon } from "src/components/tiptap-templates/simple/page-item-icon";
import { findPage } from "src/lib/find-page";
import type { PageCover } from "src/components/tiptap-templates/simple/types";
import { useDataSource } from "../../../hooks/use-data-source";
import type { CellValue, ID, RelationValue } from "../../../types/types";
import type { CellProps } from "../types";
import "./relation-cell.scss";

// Tolerates BOTH shapes: string[] (bare ids) and RelationValue[] ({recordId}).
function relationRecordIds(raw: unknown): ID[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) =>
      typeof item === "string"
        ? item
        : item && typeof item === "object" && "recordId" in item
          ? String((item as RelationValue).recordId)
          : null,
    )
    .filter((x): x is string => !!x);
}

/**
 * Relation cell.
 *
 * Origin side (stored): value is the linked target record ids; editable.
 * Mirror side (derived): when this property is the synced counterpart
 * (syncedPropertyId set + showOnTarget false), its links are COMPUTED by
 * scanning the origin source for records whose synced relation points back at
 * this record. Read-only — can't desync because nothing is stored.
 */
export function RelationCell({
  value,
  config,
  onChange,
  readonly,
  unwrapped,
  recordId,
}: CellProps<"relation"> & { recordId?: ID }) {
  const { source: target } = useDataSource(config.targetDatabaseId || null);
  const { setPeekPageId } = usePeekPage();
  const { pages } = usePages();
  const [query, setQuery] = useState("");

  // Mirror = synced counterpart that only displays the reverse links.
  const isMirror = !!config.syncedPropertyId && !config.showOnTarget;
  const effectiveReadonly = readonly || isMirror;

  // Linked ids: derived for the mirror, stored for the origin.
  const ids = useMemo(() => {
    if (isMirror) {
      if (!target || !config.syncedPropertyId || !recordId) return [];
      return target.records
        .filter((r) =>
          relationRecordIds(r.values[config.syncedPropertyId as ID]).includes(
            recordId,
          ),
        )
        .map((r) => r.id);
    }
    return (value as unknown as string[] | null) ?? [];
  }, [isMirror, target, config.syncedPropertyId, recordId, value]);

  const titleProp = useMemo(
    () => target?.properties.find((p) => p.config.type === "title"),
    [target?.properties],
  );

  const recById = (recId: string) =>
    target?.records.find((r) => r.id === recId);

  const labelOf = (recId: string): string => {
    const rec = recById(recId);
    if (!rec) return "Untitled";
    const t = titleProp ? rec.values[titleProp.id] : null;
    return (typeof t === "string" && t.trim()) || "Untitled";
  };

  const pageOf = (recId: string): number | null =>
    recById(recId)?.pageId ?? null;

  const coverOf = (recId: string): PageCover | null => {
    const pid = pageOf(recId);
    if (pid == null || !pages) return null;
    return findPage(pages, pid)?.cover ?? null;
  };

  const candidates = useMemo(() => {
    const recs = target?.records ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return recs;
    return recs.filter((r) => {
      const t = titleProp ? r.values[titleProp.id] : null;
      const label = (typeof t === "string" && t) || "Untitled";
      return label.toLowerCase().includes(q);
    });
  }, [target?.records, titleProp, query]);

  const commit = (next: string[]) =>
    onChange?.(next as unknown as CellValue<"relation"> | null);

  const toggle = (recId: string) =>
    commit(
      ids.includes(recId) ? ids.filter((x) => x !== recId) : [...ids, recId],
    );

  const remove = (recId: string) => commit(ids.filter((x) => x !== recId));

  const openPeek = (recId: string) => {
    const pid = pageOf(recId);
    if (pid != null) setPeekPageId(pid);
  };

  // ── Chips ───────────────────────────────────────────────────────────────
  const chip = (recId: string) => {
    const cover = coverOf(recId);
    return (
      <span
        key={recId}
        className="db-relation-chip"
        onClick={(e) => {
          e.stopPropagation();
          openPeek(recId);
        }}
      >
        {cover && (
          <PageItemIcon cover={cover} styles={{ width: 14, height: 14 }} />
        )}
        <span className="db-relation-chip__label">{labelOf(recId)}</span>
        {!effectiveReadonly && (
          <button
            type="button"
            className="db-relation-chip__remove"
            aria-label="Remove"
            onClick={(e) => {
              e.stopPropagation();
              remove(recId);
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
      className="db-cell"
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
                config.targetDatabaseId
                  ? "Search records…"
                  : "No related database set"
              }
              disabled={!config.targetDatabaseId}
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
            {!config.targetDatabaseId ? (
              <span style={{ fontSize: 12, color: "var(--tt-text-secondary)" }}>
                Set a related database in the property settings.
              </span>
            ) : candidates.length === 0 ? (
              <span style={{ fontSize: 12, color: "var(--tt-text-secondary)" }}>
                No records
              </span>
            ) : (
              candidates.map((rec) => {
                const selected = ids.includes(rec.id);
                const t = titleProp ? rec.values[titleProp.id] : null;
                const label = (typeof t === "string" && t.trim()) || "Untitled";
                const cover = coverOf(rec.id);
                return (
                  <Button
                    key={rec.id}
                    variant="ghost"
                    onClick={() => toggle(rec.id)}
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
