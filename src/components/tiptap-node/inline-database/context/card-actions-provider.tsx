// ─── CardActionsProvider ────────────────────────────────────────────────────
// Builds the record/card action handlers ONCE from the database context, then:
//   1. provides them via CardActionsContext (board/gallery cards, in-tree), and
//   2. publishes them to cardActionsStore (the body-portaled drag-handle Menu,
//      which is outside the tree and can't read context).
//
// Mount this INSIDE DatabaseProvider (so it can read useDatabaseContext) and
// wrap the database's rendered subtree. All record menus then call
// useCardActions() instead of receiving handlers as props — one source, no
// prop-drilling, reaches both in-tree and portaled consumers.
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useDatabaseContext } from "../nodes/database-context";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage as patchPageApi } from "src/api/pages";
import { CardActionsContext } from "./card-actions-context";
import { cardActionsStore } from "./card-actions-store";
import type { CardActionsValue } from "./card-actions-context-value";
import type { CellValue, ID, PageCategory, PropertyType } from "src/types";
import { useDataSource } from "../hooks/use-data-source";
import type { Target } from "src/components/tiptap-ui/cover/types";
import { useActivePageActions } from "src/components/tiptap-templates/simple/context/active-page-context";
import { usePageViewActions } from "src/components/tiptap-templates/simple/context/page-view-context";

export function CardActionsProvider({ children }: { children: ReactNode }) {
  const { source, sortedRecords, visibleProperties, db } = useDatabaseContext();
  const { setActivePageId } = useActivePageActions();
  const { setTarget } = usePageViewActions();
  const { setCellValue, removeRecordAsync, addRecordAsync } = useDataSource(
    source?.id,
  );

  const dbRef = useRef(db);
  useEffect(() => {
    dbRef.current = db;
  }, [db]);

  // For page-level patches (favorite / move / icon) — the source doesn't expose
  // a page patch, so use the same mutation the data source uses internally.
  const { mutate: patchPageMutate } = usePatchPage(({ id, patch }) =>
    patchPageApi(id, patch),
  );

  const value = useMemo<CardActionsValue>(() => {
    const recordById = new Map(sortedRecords.map((r) => [r.id, r]));
    const getRecord = (id: ID) => recordById.get(id) ?? null;
    const isFavorite = (id: ID) => getRecord(id)?.category === "Favorites";

    return {
      getRecord,
      properties: visibleProperties,
      isFavorite,

      setValue: (recordId, propertyId, v) =>
        setCellValue(recordId, propertyId, v as CellValue<PropertyType>),

      deleteRecord: (recordId) => {
        void removeRecordAsync(recordId);
      },

      duplicateRecord: (recordId) => {
        const r = getRecord(recordId);
        if (!r) return;
        // No dedicated duplicate on the source — seed a new record. If the
        // source gains addRecordAsync({ values }) later, copy r.values here.
        void addRecordAsync({ title: r.title ?? "" });
      },

      toggleFavorite: (recordId) => {
        const r = getRecord(recordId);
        patchPageMutate({
          id: recordId,
          patch: {
            category: r?.category === "Favorites" ? "Private" : "Favorites",
          },
        });
      },

      moveRecord: (recordId, newParentId, category) =>
        patchPageMutate({
          id: recordId,
          patch: {
            parentId: newParentId,
            category: (category as PageCategory) ?? "Private",
          },
        }),

      setRecordIcon: (recordId, iconName, color, target) => {
        const r = getRecord(recordId);
        patchPageMutate({
          id: recordId,
          patch: {
            cover: {
              ...(r?.cover ?? {
                coverImage: null,
                gradient: null,
                positionY: null,
              }),
              iconName,

              color: color ?? null,
              target: (target as Target | undefined) ?? "Icons",
            },
          },
        });
      },
      openInRecord: (recordId, mode) => {
        if (mode === "sidePeek") {
          setTarget({ pageId: recordId, view: "Peek" });
        } else {
          // New tab = full page.
          setActivePageId(recordId);
        }
      },

      openLayout: () => dbRef.current.openViewOptionsAt({ type: "layout" }),
      openPropertyVisibility: () =>
        dbRef.current.openViewOptionsAt({ type: "properties" }),
      openEditProperty: (propertyId) =>
        dbRef.current.setOpenPropertyId(propertyId),

      onEditGroups: () => dbRef.current.openViewOptionsAt({ type: "group" }),
    };
  }, [
    sortedRecords,
    visibleProperties,
    patchPageMutate,
    setCellValue,
    removeRecordAsync,
    addRecordAsync,
    setActivePageId,
    setTarget,
  ]);

  // Publish to the store for the portaled drag-handle Menu (outside the tree).
  useEffect(() => {
    cardActionsStore.set(value);
    return () => cardActionsStore.clear();
  }, [value]);

  return (
    <CardActionsContext.Provider value={value}>
      {children}
    </CardActionsContext.Provider>
  );
}
