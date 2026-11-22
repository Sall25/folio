// Builds the per-database "bridge" payload the cell/record NodeViews read
// (properties, records-by-id, column widths, column values, sticky geometry,
// setCellValue) and publishes it into editor storage so those NodeViews — which
// live outside this React tree and can't receive context — can access it, keyed
// by the database node id.

import { useCallback, useMemo } from "react";
import type { Editor } from "@tiptap/react";
import type {
  DatabaseAttrs,
  DatabaseProperty,
  DatabaseView,
  ID,
  Page,
  PageCover,
} from "src/types";
import { usePublishDatabaseData } from "./use-database-bridge-data";
import type { DatabaseBridgeData } from "../utils/database-bridge";
import type { UseDataSourceReturn } from "./use-data-source";
import type { BoardLayout, BoardPlacement } from "./use-board-layout";
import type { GalleryLayout, GalleryPlacement } from "./use-gallery-layout";
import type { CalendarLayout, CalendarPlacement } from "./use-calendar-layout";
import type { TimelineLayout, TimelinePlacement } from "./use-timeline-layout";
import { useSession } from "src/hooks/use-session";
import { usePageTitles } from "./use-page-titles";
import { frozenPropertyIdFor, useDbSize } from "../utils/db-size";
import type { SubItemInfo } from "../utils/sub-items";
import { blockingIdsOf, dependencyPair } from "../utils/dependencies";
import {
  computeRecordColors,
  type RecordColors,
} from "../utils/conditional-color";

interface Params {
  editor: Editor | null;
  attrs: DatabaseAttrs;
  properties: DatabaseProperty[];
  activeView: DatabaseView | undefined;
  locked: boolean;
  resolvedRecords: Page[];
  sortedRecords: Page[];
  draftWidths: Record<string, number>;
  hasSource: boolean;
  /** Pass the stable callback from `useDataSource` directly: a new function
   *  each render would change `bridgeSetCellValue` and re-publish to every row. */
  setCellValue: UseDataSourceReturn["setCellValue"];
  rowSlots: string[];
  /** Template page cover, fetched once by the database node view and passed in
   *  — the fallback title icon. No per-cell (or per-hook) fetch. */
  templateCover: PageCover | null;
  boardLayout: BoardLayout;
  galleryLayout: GalleryLayout;
  calendarLayout: CalendarLayout;
  timelineLayout: TimelineLayout;
  subItems: Record<ID, SubItemInfo> | null;
  setRowOpen: (recordId: ID, open: boolean) => void;
  addSubItem: (parentId: ID) => void;
  reorderRecord: (recordId: ID, beforeRecordId: ID | null) => void;
}

const EMPTY_GALLERY_PLACEMENT: Record<string, GalleryPlacement> = {};
const EMPTY_BOARD_PLACEMENT: BoardPlacement = {};
const EMPTY_CALENDAR_PLACEMENT: Record<string, CalendarPlacement> = {};
const EMPTY_TIMELINE_PLACEMENT: Record<string, TimelinePlacement> = {};
const EMPTY_RECORD_COLORS: Record<string, RecordColors> = {};
const EMPTY_BLOCKING: Record<string, string[]> = {};

export function useDatabaseBridgePublish({
  editor,
  attrs,
  properties,
  activeView,
  locked,
  resolvedRecords,
  sortedRecords,
  draftWidths,
  hasSource,
  setCellValue,
  rowSlots,
  templateCover,
  boardLayout,
  galleryLayout,
  calendarLayout,
  timelineLayout,
  subItems,
  setRowOpen,
  addSubItem,
  reorderRecord,
}: Params) {
  const bridgeSetCellValue = useCallback(
    (recordId: string, propertyId: string, value: unknown) => {
      setCellValue(recordId, propertyId, value as never);
    },
    [setCellValue],
  );

  const recordsById = useMemo(
    () => new Map((hasSource ? resolvedRecords : []).map((r) => [r.id, r])),
    [resolvedRecords, hasSource],
  );

  const dbSize = useDbSize(attrs.id);

  const columnWidthByProp = useMemo(() => {
    const out: Record<string, number> = {};
    properties.forEach((p) => {
      out[p.id] = draftWidths[p.id] ?? p.width ?? 160;
    });
    return out;
  }, [properties, draftWidths]);

  // What each record blocks, by its own id — the stored side of the
  // dependency pair (utils/dependencies.ts). A bar writes a link by adding
  // to one of these lists, and a list has to be whole: the links it holds
  // to records this view filtered out must survive the write.
  const blockingByRecord = useMemo(() => {
    const pair = dependencyPair(properties, attrs.sourceId);
    if (!pair) return EMPTY_BLOCKING;
    const out: Record<string, string[]> = {};
    for (const r of sortedRecords) {
      const ids = blockingIdsOf(r, pair.blocking.id);
      if (ids.length) out[r.id] = ids;
    }
    return out;
  }, [properties, sortedRecords, attrs.sourceId]);

  const columnValuesByProp = useMemo(() => {
    const out: Record<string, unknown[]> = {};
    properties.forEach((p) => {
      out[p.id] = sortedRecords.map((r) => r.values?.[p.id] ?? null);
    });
    return out;
  }, [properties, sortedRecords]);

  // Sticky geometry for frozen columns — the same accumulation the header does
  // (DatabaseTableHeader.stickyStyle), computed once here so every cell doesn't
  // recompute it. Freezing is a VIEW concern, so the cells don't move in the
  // document; they just render sticky at the right offset.
  const stickyByProp = useMemo(() => {
    const out: Record<string, { left: number; isBoundary: boolean }> = {};

    const hidden = new Set(activeView?.hiddenProperties ?? []);
    const visible = properties.filter((p) => !hidden.has(p.id));

    const frozenId = frozenPropertyIdFor(activeView, dbSize, properties);
    const freezeIndex = frozenId
      ? visible.findIndex((p) => p.id === frozenId)
      : -1;
    if (freezeIndex < 0) return out;

    let acc = 0;
    visible.forEach((p, i) => {
      if (i > freezeIndex) return;
      out[p.id] = { left: acc, isBoundary: i === freezeIndex };
      acc += columnWidthByProp[p.id] ?? 160;
    });
    return out;
  }, [properties, activeView, columnWidthByProp, dbSize]);

  // Conditional color: worked out once per change, here, so each row and
  // cell only looks its own colour up. Cells only in a table.
  const meId = useSession().session?.user.id ?? null;
  const titleOf = usePageTitles();
  const recordColors = useMemo(
    () =>
      activeView?.colorRules?.length
        ? computeRecordColors(
            recordsById.values(),
            activeView.colorRules,
            properties,
            { meId, titleOf },
            activeView.type === "table",
          )
        : EMPTY_RECORD_COLORS,
    [activeView, recordsById, properties, meId, titleOf],
  );

  const bridgeData: DatabaseBridgeData = useMemo(
    () => ({
      sourceId: attrs.sourceId ?? null,
      properties,
      view: activeView,
      locked,
      templateId: attrs.templateId,
      templateCover,
      recordsById,
      columnWidthByProp,
      sortedRecordIds: rowSlots,
      stickyByProp,
      recordColors,
      blockingByRecord,
      setCellValue: bridgeSetCellValue,
      columnValuesByProp:
        columnValuesByProp as DatabaseBridgeData["columnValuesByProp"],
      boardPlacement:
        activeView?.type === "board"
          ? boardLayout.placement
          : EMPTY_BOARD_PLACEMENT,
      galleryPlacement:
        activeView?.type === "gallery"
          ? galleryLayout.placement
          : EMPTY_GALLERY_PLACEMENT,
      calendarPlacement:
        activeView?.type === "calendar"
          ? calendarLayout.placement
          : EMPTY_CALENDAR_PLACEMENT,
      timelinePlacement:
        activeView?.type === "timeline"
          ? timelineLayout.placement
          : EMPTY_TIMELINE_PLACEMENT,
      subItems,
      setRowOpen,
      addSubItem,
      reorderRecord,
    }),
    [
      attrs.sourceId,
      attrs.templateId,
      templateCover,
      properties,
      activeView,
      locked,
      recordsById,
      columnWidthByProp,
      rowSlots,
      stickyByProp,
      recordColors,
      blockingByRecord,
      columnValuesByProp,
      bridgeSetCellValue,
      boardLayout,
      galleryLayout,
      calendarLayout,
      timelineLayout,
      subItems,
      setRowOpen,
      addSubItem,
      reorderRecord,
    ],
  );

  usePublishDatabaseData(editor, attrs.id ?? null, bridgeData);

  return { recordsById };
}
