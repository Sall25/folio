import { useMemo, useState } from "react";
import { Check, Search, X } from "src/components/icons";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { PageItemIcon } from "src/features/pages/page-item/page-item-icon";
import type { PageCover, CellValue, ID } from "src/types";
import { useDataSource } from "../../../hooks/use-data-source";
import { useRows } from "src/hooks/use-pages";
import type { CellProps } from "../types";
import "./relation-cell.scss";
import { usePageView } from "src/features/pages/context/page-view-context";
import { relationRecordIds } from "src/lib/relation-ids";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage as patchPageApi } from "src/api/pages";
import { rowIdText, rowMatchesSearch } from "../../../utils/row-summary";

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
 * this row. Editing it writes to those rows: linking a row adds this row to
 * its stored relation, unlinking removes it — so both sides always agree and
 * the stored side stays the single source of truth.
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
  className,
}: CellProps<"relation"> & { recordId?: ID }) {
  // The target database: its ID property, if any, lets rows be found by ID.
  const { source: targetSource } = useDataSource(config.targetSourceId || null);
  const { setTarget } = usePageView();
  const { data: targetRows } = useRows(config.targetSourceId || "");
  const rows = useMemo(() => targetRows ?? [], [targetRows]);
  const [query, setQuery] = useState("");

  const isMirror = !!config.mirrorPropertyId && !config.showOnTarget;
  // The mirror edits the other side's rows, so it needs this row's id.
  const effectiveReadonly = readonly || (isMirror && !recordId);
  const patchRow = usePatchPage(({ id, patch }) => patchPageApi(id, patch));

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
    // By title, or by ID ("TASK-12" or "12").
    return rows.filter((r) => rowMatchesSearch(r, q, targetSource?.properties));
  }, [rows, query, targetSource?.properties]);

  const commit = (next: string[]) =>
    onChange?.(next as unknown as CellValue<"relation"> | null);

  // Mirror side: link / unlink by editing the other row's stored relation.
  const setMirrorLink = (rowId: string, linked: boolean) => {
    const row = rowById(rowId);
    const originPropId = config.mirrorPropertyId;
    if (!row || !originPropId || !recordId) return;
    const current = relationRecordIds(row.values?.[originPropId]);
    const next = linked
      ? current.includes(recordId)
        ? current
        : [...current, recordId]
      : current.filter((x) => x !== recordId);
    patchRow.mutate({
      id: row.id,
      patch: {
        values: {
          ...(row.values ?? {}),
          // stored as bare ids, the same shape the origin cell writes
          [originPropId]: next as unknown as CellValue<"relation">,
        },
      },
    });
  };

  const toggle = (id: string) => {
    if (isMirror) return setMirrorLink(id, !ids.includes(id));
    commit(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  };

  const remove = (id: string) => {
    if (isMirror) return setMirrorLink(id, false);
    commit(ids.filter((x) => x !== id));
  };

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

  // Readonly: just the chips, no picker. (The mirror edits through
  // setMirrorLink, so it doesn't need onChange.)
  if (effectiveReadonly || (!onChange && !isMirror)) return trigger;

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
                    {rowIdText(row, targetSource) && (
                      <span className="db-relation-cell__id">
                        {rowIdText(row, targetSource)}
                      </span>
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
