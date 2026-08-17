import type {
  DataSource,
  Page,
  DatabaseProperty,
  DatabaseView,
  SavedView,
  ID,
  PropertyType,
} from "src/types";
import { resolveRecordFormulas } from "../../../../lib/resolve-records-formula";
import { usePagesBase, useRows } from "src/hooks/use-pages";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";
import type { CellValue, RowTemplate } from "src/types";
import { makeRow } from "src/utils/make-row";
import { useAddRow } from "src/hooks/use-add-row";
import { newId } from "src/lib/id";
import { useDeletePage } from "src/hooks/use-delete-page";
import { usePatchDataSource } from "src/hooks/use-patch-data-source";
import { patchDataSource } from "src/api/data-sources";
import { useDataSource as useDataSourceApi } from "src/hooks/use-data-sources";
import { useChangePropertyType } from "src/hooks/use-change-property-type";
import { useMaterializeComputedColumn } from "src/hooks/use-materialized-computed-column";
import { makeDefaultView } from "src/utils/make-default-view";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useCurrentPerson } from "src/hooks/use-session";

// module scope, outside the hook
const patchDataSourceFn = ({
  id,
  patch,
}: {
  id: ID;
  patch: Partial<Omit<DataSource, "id" | "properties">>;
}) => patchDataSource(id, patch);

export interface UseDataSourceReturn {
  source: DataSource | undefined;
  isLoading: boolean;
  getCellValue: (
    recordId: ID,
    propertyId: ID,
  ) => CellValue<PropertyType> | null;
  setCellValue: (
    recordId: ID,
    propertyId: ID,
    value: CellValue<PropertyType>,
  ) => void;
  addRecordAsync: (opts?: {
    title?: string;
    templateId?: string;
  }) => Promise<Page>;
  removeRecordAsync: (recordId: ID) => Promise<void>;
  /** Create a template: makes a Template-category page and registers it. */
  createRowTemplateAsync: (name: string) => Promise<RowTemplate>;

  /** Delete a template: removes its page AND unregisters it (no orphan). */
  deleteRowTemplateAsync: (templateId: ID) => Promise<void>;

  /** Set (or clear, with null) the default template for new rows — the check. */
  setDefaultRowTemplateAsync: (templateId: ID | null) => Promise<void>;

  /** Save an existing row as a new template (creates a page from the row). */
  saveRowAsTemplateAsync: (
    recordId: ID,
    name: string,
  ) => Promise<RowTemplate | undefined>;
  /** Change a property's type, migrating every record's value in one PATCH. */
  changePropertyTypeAsync: (
    propId: ID,
    newProp: DatabaseProperty,
  ) => Promise<void>;
  updatePropertiesAsync: (
    properties: DatabaseProperty[],
  ) => Promise<DataSource>;
  updateSourceMetaAsync: (patch: {
    name?: string;
    pageId?: ID;
  }) => Promise<DataSource>;
  // ── Source-owned views (shared across every node on this source) ────────
  addViewAsync: (
    type: DatabaseView["type"],
    name: string,
  ) => Promise<DatabaseView | undefined>;
  updateViewAsync: (
    viewId: ID,
    patch: Partial<Omit<DatabaseView, "id">>,
  ) => Promise<DataSource | undefined>;
  deleteViewAsync: (viewId: ID) => Promise<DatabaseView[]>;
  duplicateViewAsync: (viewId: ID) => Promise<DatabaseView | undefined>;

  // ── Saved-view catalog (bookkeeping for "start from") ───────────────────
  registerViewsAsync: (entries: SavedView[]) => Promise<void>;
  unregisterViewsAsync: (entries: ID[]) => Promise<void>;

  resolvedRecords: Page[];
}

export function useDataSource(
  sourceId: ID | null | undefined,
): UseDataSourceReturn {
  const { data: source, isLoading } = useDataSourceApi(sourceId ?? null);
  const sourceRef = useRef(source);
  useEffect(() => void (sourceRef.current = source), [source]);

  const { data: rowsData } = useRows(sourceId ?? "");
  const rows = useMemo(() => rowsData ?? [], [rowsData]);
  const rowsRef = useRef(rows);
  useEffect(() => void (rowsRef.current = rows), [rows]);

  const getCellValue = useCallback((recordId: ID, propertyId: ID) => {
    const page = rowsRef.current.find((p) => p.id === recordId);
    return page ? (page.values?.[propertyId] ?? null) : null;
  }, []);

  // Extract stable mutate fns. useMutation returns a NEW object every render
  // (it carries live status), but the .mutate/.mutateAsync methods keep a
  // stable identity — so depend on those, never on the mutation object.
  const mutatePage = usePatchPage(({ id, patch }) => patchPage(id, patch));
  const patchPageMutate = mutatePage.mutate;

  const setCellValue = useCallback(
    (recordId: ID, propertyId: ID, value: CellValue<PropertyType>) => {
      const record = rowsRef.current.find((r) => r.id === recordId);
      if (!record) return;
      patchPageMutate({
        id: recordId,
        patch: { values: { ...(record.values ?? {}), [propertyId]: value } },
      });
    },
    [patchPageMutate],
  );

  const addRow = useAddRow();
  const addRowAsync = addRow.mutateAsync;
  const { person } = useCurrentPerson();

  // The full pages list — MUST include template pages, so use the base hook,
  // not usePages() (which filters out sourceId != null).
  const { data: allPages } = usePagesBase((p) => p);

  const pagesRef = useRef(allPages);
  useEffect(() => {
    pagesRef.current = allPages;
  }, [allPages]);

  // CREATE row from optional template (templateId falls back to node default elsewhere)
  const addRecordAsync = useCallback(
    async (opts?: { title?: string; templateId?: ID }): Promise<Page> => {
      if (!sourceRef.current || !person) throw new Error("No source");

      const template = opts?.templateId
        ? sourceRef.current.rowTemplates.find((t) => t.id === opts.templateId)
        : undefined;

      // Clone the template PAGE's current content (Model B). Read via ref so this
      // callback doesn't depend on the pages list and stays stable.
      const templatePage = template?.pageId
        ? pagesRef.current?.find((p) => p.id === template.pageId)
        : undefined;

      const row = makeRow(sourceRef.current, {
        ownerId: person.id,
        title: opts?.templateId ? templatePage?.title : opts?.title,
        template,
        content: templatePage?.content ?? undefined,
        cover: templatePage?.cover,
      });

      await addRowAsync(row);
      return row;
    },
    [addRowAsync, person],
  );

  const deletePage = useDeletePage();
  const deletePageAsync = deletePage.mutateAsync;
  const removeRecordAsync = useCallback(
    async (recordId: ID) => {
      await deletePageAsync(recordId);
    },
    [deletePageAsync],
  );

  const mutateSource = usePatchDataSource(patchDataSourceFn);
  const patchSourceAsync = mutateSource.mutateAsync;

  // ── row-template CRUD (source-owned config, via source patch) ──────────────

  const createRowTemplateAsync = useCallback(
    async (name: string): Promise<RowTemplate> => {
      if (!sourceRef.current || !person) throw new Error("No source");

      // The editable template page: a real page tied to this source, marked
      // Template so useRows excludes it from live rows.
      const page = makeRow(sourceRef.current, {
        title: name,
        ownerId: person.id,
      });
      await addRowAsync({ ...page, category: "Template" });

      // Register it in the source so the picker can list/open/apply it.
      const template: RowTemplate = {
        id: newId(),
        name,
        values: {},
        pageId: page.id,
        createdAt: Date.now(),
      };
      await patchSourceAsync({
        id: sourceRef.current.id,
        patch: {
          rowTemplates: [...(sourceRef.current.rowTemplates ?? []), template],
        },
      });
      return template;
    },
    [addRowAsync, patchSourceAsync, person],
  );

  const deleteRowTemplateAsync = useCallback(
    async (templateId: ID) => {
      if (!sourceRef.current) throw new Error("No source");
      const tpl = sourceRef.current.rowTemplates?.find(
        (t) => t.id === templateId,
      );
      if (tpl?.pageId) await deletePageAsync(tpl.pageId); // delete the page too — no orphan
      await patchSourceAsync({
        id: sourceRef.current.id,
        patch: {
          rowTemplates: (sourceRef.current.rowTemplates ?? []).filter(
            (t) => t.id !== templateId,
          ),
        },
      });
    },
    [patchSourceAsync, deletePageAsync],
  );

  const setDefaultRowTemplateAsync = useCallback(
    async (templateId: ID | null) => {
      if (!sourceRef.current) throw new Error("No source");
      await patchSourceAsync({
        id: sourceRef.current.id,
        patch: { defaultTemplateId: templateId },
      });
    },
    [patchSourceAsync],
  );

  // "save this row AS a template" — snapshot a row-page's values + content
  const saveRowAsTemplateAsync = useCallback(
    async (rowId: ID, name: string) => {
      const row = rowsRef.current.find((r) => r.id === rowId);
      if (!row || !sourceRef.current) return undefined;
      const template: RowTemplate = {
        id: newId(),
        name,
        values: { ...(row.values ?? {}) },
        content: row.content ? structuredClone(row.content) : null,
        createdAt: Date.now(),
      };
      await patchSourceAsync({
        id: sourceRef.current.id,
        patch: {
          rowTemplates: [...(sourceRef.current.rowTemplates ?? []), template],
        },
      });
      return template;
    },
    [patchSourceAsync],
  );

  // the ONE hook allowed to write properties[] — layout only (reorder/width/wrap)
  const updatePropertiesAsync = useCallback(
    async (properties: DatabaseProperty[]) => {
      const src = sourceRef.current;
      if (!src) throw new Error("No source");
      return patchSourceAsync({
        id: src.id,
        patch: { properties } as Parameters<
          typeof patchSourceAsync
        >[0]["patch"],
      });
    },
    [patchSourceAsync],
  );

  const updateSourceMetaAsync = useCallback(
    async (patch: { name?: string; pageId?: ID }) => {
      const src = sourceRef.current;
      if (!src) throw new Error("No source");
      return patchSourceAsync({ id: src.id, patch });
    },
    [patchSourceAsync],
  );

  // Change a property's type AND migrate every record's value in a single
  // whole-source PATCH, so the new config never momentarily sees old-shaped
  // values. When converting away from a COMPUTED type (rollup/formula) — whose
  // displayed value isn't stored — we snapshot the computed values first (from
  // the cache) so the new column inherits them. planTypeChange is pure.
  const changeType = useChangePropertyType();
  const changeTypeAsync = changeType.mutateAsync;
  const materialize = useMaterializeComputedColumn();
  const materializeAsync = materialize.mutateAsync;

  const changePropertyTypeAsync = useCallback(
    async (propId: ID, newProp: DatabaseProperty) => {
      const src = sourceRef.current;
      if (!src) throw new Error("No source");
      const cfg = src.properties.find((p) => p.id === propId)?.config;

      // converting AWAY from a computed type → materialize (snapshot + store)
      if (cfg?.type === "rollup" || cfg?.type === "formula") {
        return materializeAsync({
          sourceId: src.id,
          propertyId: propId,
          newProp,
        });
      }
      // scalar → scalar (or scalar → relation/rollup is remove+add, handled elsewhere)
      return changeTypeAsync({
        sourceId: src.id,
        propertyId: propId,
        newProp,
      });
    },
    [changeTypeAsync, materializeAsync],
  );
  // ── Views: the shared catalog. Every node on this source reads/writes
  //    here; a node only keeps which view is active (attrs.activeViewId).
  const addViewAsync = useCallback(
    async (
      type: DatabaseView["type"],
      name: string,
    ): Promise<DatabaseView | undefined> => {
      if (!sourceRef.current) throw new Error("no source");
      const view = makeDefaultView(type, name);
      await patchSourceAsync({
        id: sourceRef.current.id,
        patch: { views: [...(sourceRef.current.views ?? []), view] },
      });
      return view;
    },
    [patchSourceAsync],
  );

  const updateViewAsync = useCallback(
    async (viewId: ID, patch: Partial<Omit<DatabaseView, "id">>) => {
      if (!sourceRef.current) throw new Error("no source");
      return patchSourceAsync({
        id: sourceRef.current.id,
        patch: {
          views: (sourceRef.current.views ?? []).map((v) =>
            v.id === viewId ? ({ ...v, ...patch } as DatabaseView) : v,
          ),
        },
      });
    },
    [patchSourceAsync],
  );

  const deleteViewAsync = useCallback(
    async (viewId: ID): Promise<DatabaseView[]> => {
      if (!sourceRef.current) throw new Error("no source");
      const next = await patchSourceAsync({
        id: sourceRef.current.id,
        patch: {
          views: (sourceRef.current.views ?? []).filter((v) => v.id !== viewId),
        },
      });
      const remaining = next.views;
      return remaining;
    },
    [patchSourceAsync],
  );

  const duplicateViewAsync = useCallback(
    async (viewId: ID): Promise<DatabaseView | undefined> => {
      if (!sourceRef.current) throw new Error("no source");
      const source = sourceRef.current;
      const src = source.views.find((v) => v.id === viewId);
      if (!src) return undefined;
      // Clone every field — filters, sorts, grouping, layout — keeping only a
      // fresh identity. Spreading the union member preserves its type fields.
      const copy = {
        ...src,
        id: crypto.randomUUID(),
        name: `${src.name} copy`,
      } as DatabaseView;
      const next = await patchSourceAsync({
        id: source.id,
        patch: { views: [...(source.views ?? []), copy] },
      });
      return next ? copy : undefined;
    },
    [patchSourceAsync],
  );

  // ── Saved-view catalog: snapshot full views into source.savedViews so any
  //    node can open one with its filters/sorts intact. Keyed by view id;
  //    only writes when a view actually changed (deep compare, no storms).
  const registerViewsAsync = useCallback(
    async (entries: SavedView[]) => {
      const src = sourceRef.current;
      if (!src || entries.length === 0) return;

      const existing = src.savedViews ?? [];
      const byId = new Map(existing.map((e) => [e.id, e]));
      let changed = false;
      for (const e of entries) {
        const prev = byId.get(e.id);
        if (!prev || JSON.stringify(prev) !== JSON.stringify(e)) {
          byId.set(e.id, e);
          changed = true;
        }
      }
      if (!changed) return;

      await patchSourceAsync({
        id: src.id,
        patch: { savedViews: [...byId.values()] },
      });
    },
    [patchSourceAsync],
  );

  // Counterpart to registerViewsAsync — prune saved views whose ids are no
  // longer present on the node (e.g. a view was deleted). No-op guarded so it
  // only writes when something actually changed.
  const unregisterViewsAsync = useCallback(
    async (viewIds: ID[]) => {
      const src = sourceRef.current;
      if (!src || viewIds.length === 0) return;

      const existing = src.savedViews ?? [];
      const removeSet = new Set(viewIds);
      const next = existing.filter((e) => !removeSet.has(e.id));

      if (next.length === existing.length) return; // nothing removed

      await patchSourceAsync({
        id: src.id,
        patch: { savedViews: next },
      });
    },
    [patchSourceAsync],
  );

  const resolvedRecords = useMemo(
    () => (source ? resolveRecordFormulas(rows, source.properties) : []),
    [rows, source],
  );

  return {
    source,
    resolvedRecords,
    isLoading,
    getCellValue,
    setCellValue,
    addRecordAsync,
    removeRecordAsync,
    createRowTemplateAsync,
    deleteRowTemplateAsync,
    saveRowAsTemplateAsync,
    updatePropertiesAsync,
    updateSourceMetaAsync,
    changePropertyTypeAsync,
    addViewAsync,
    updateViewAsync,
    deleteViewAsync,
    duplicateViewAsync,
    registerViewsAsync,
    unregisterViewsAsync,
    setDefaultRowTemplateAsync,
  };
}
