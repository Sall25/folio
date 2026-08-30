import { useState, useCallback, useMemo } from "react";
import type {
  DatabaseAttrs,
  DatabaseView,
  ID,
  CellAddress,
  PanelView,
  DatabaseUIState,
} from "src/types";
import { makeDefaultView } from "../utils";

export type UseDatabaseUIReturn = ReturnType<typeof useDatabaseUI>;

export function useDatabaseUI(
  attrs: DatabaseAttrs,
  updateAttributes: (attrs: Record<string, unknown>) => void,
) {
  // ── Ephemeral UI state ─────────────────────────────────────────────────
  const [uiState, setUIState] = useState<DatabaseUIState>({
    editingCell: null,
    openRecordId: null,
    openPropertyId: null,
    searchQuery: "",
    panelStack: [{ type: "main" }],
    viewOptionsOpen: false,
  });

  const patchUI = useCallback(
    (patch: Partial<DatabaseUIState>) =>
      setUIState((prev) => ({ ...prev, ...patch })),
    [],
  );

  // ── Derived ────────────────────────────────────────────────────────────

  const activeView = useMemo(
    () =>
      attrs.views.find((v) => v.id === attrs.activeViewId) ??
      attrs.views[0] ??
      null,
    [attrs.views, attrs.activeViewId],
  );

  const currentPanel: PanelView =
    uiState.panelStack[uiState.panelStack.length - 1];

  // ── Cell editing ───────────────────────────────────────────────────────

  const setEditingCell = useCallback(
    (cell: CellAddress | null) => patchUI({ editingCell: cell }),
    [patchUI],
  );

  const isCellEditing = useCallback(
    (recordId: ID, propertyId: ID) =>
      uiState.editingCell?.pageId === recordId &&
      uiState.editingCell?.propertyId === propertyId,
    [uiState.editingCell],
  );

  // ── Record / property popups ───────────────────────────────────────────

  const setOpenRecordId = useCallback(
    (id: ID | null) => patchUI({ openRecordId: id, editingCell: null }),
    [patchUI],
  );

  const setOpenPropertyId = useCallback(
    (id: ID | null) =>
      patchUI({ openPropertyId: id, panelStack: [{ type: "main" }] }),
    [patchUI],
  );

  // ── Search ─────────────────────────────────────────────────────────────

  const setSearchQuery = useCallback(
    (q: string) => patchUI({ searchQuery: q }),
    [patchUI],
  );

  // ── Panel stack ────────────────────────────────────────────────────────

  const pushPanel = useCallback(
    (view: PanelView) =>
      setUIState((prev) => ({
        ...prev,
        panelStack: [...prev.panelStack, view],
      })),
    [],
  );

  const popPanel = useCallback(
    () =>
      setUIState((prev) => ({
        ...prev,
        panelStack:
          prev.panelStack.length > 1
            ? prev.panelStack.slice(0, -1)
            : prev.panelStack,
      })),
    [],
  );

  const resetPanel = useCallback(
    () => patchUI({ panelStack: [{ type: "main" }] }),
    [patchUI],
  );

  // ── View mutations (persisted into ProseMirror attrs) ──────────────────

  const setActiveView = useCallback(
    (viewId: ID) => updateAttributes({ activeViewId: viewId }),
    [updateAttributes],
  );

  const addView = useCallback(
    (type: DatabaseView["type"], name: string) => {
      const newView = makeDefaultView(type, name);
      updateAttributes({
        views: [...attrs.views, newView],
        activeViewId: newView.id,
      });
    },
    [attrs.views, updateAttributes],
  );

  const updateView = useCallback(
    (viewId: ID, patch: Partial<Omit<DatabaseView, "id">>) =>
      updateAttributes({
        views: attrs.views.map((v) =>
          v.id === viewId ? ({ ...v, ...patch } as DatabaseView) : v,
        ),
      }),
    [attrs.views, updateAttributes],
  );

  const deleteView = useCallback(
    (viewId: ID) => {
      const remaining = attrs.views.filter((v) => v.id !== viewId);
      updateAttributes({
        views: remaining,
        activeViewId:
          attrs.activeViewId === viewId
            ? (remaining[0]?.id ?? null)
            : attrs.activeViewId,
      });
    },
    [attrs.views, attrs.activeViewId, updateAttributes],
  );

  const duplicateView = useCallback(
    (viewId: ID) => {
      const src = attrs.views.find((v) => v.id === viewId);
      if (!src) return;
      const copy = {
        ...src,
        id: crypto.randomUUID(),
        name: `${src.name} copy`,
      } as DatabaseView;
      updateAttributes({
        views: [...attrs.views, copy],
        activeViewId: copy.id,
      });
    },
    [attrs.views, updateAttributes],
  );

  const toggleLock = useCallback(
    () => updateAttributes({ locked: !attrs.locked }),
    [attrs.locked, updateAttributes],
  );

  const setLocked = useCallback(
    (locked: boolean) => updateAttributes({ locked }),
    [updateAttributes],
  );

  const setViewOptionsOpen = useCallback(
    (open: boolean) =>
      setUIState((prev) => ({
        ...prev,
        viewOptionsOpen: open,
        panelStack: open ? prev.panelStack : [{ type: "main" }],
      })),
    [],
  );

  // Open the view-options popover directly on a given panel. Layout, Property
  // visibility, Edit-property config and Edit groups all route through this.
  const openViewOptionsAt = useCallback(
    (panel: PanelView) =>
      setUIState((prev) => ({
        ...prev,
        viewOptionsOpen: true,
        panelStack: [{ type: "main" }, panel],
      })),
    [],
  );

  return useMemo(
    () => ({
      activeView,
      currentPanel,
      editingCell: uiState.editingCell,
      openRecordId: uiState.openRecordId,
      openPropertyId: uiState.openPropertyId,
      searchQuery: uiState.searchQuery,
      setEditingCell,
      isCellEditing,
      setOpenRecordId,
      setOpenPropertyId,
      setSearchQuery,
      pushPanel,
      popPanel,
      resetPanel,
      setActiveView,
      addView,
      updateView,
      deleteView,
      duplicateView,
      locked: !!attrs.locked,
      toggleLock,
      setLocked,
      viewOptionsOpen: uiState.viewOptionsOpen,
      setViewOptionsOpen,
      openViewOptionsAt,
    }),
    [
      activeView,
      currentPanel,
      uiState.editingCell,
      uiState.openRecordId,
      uiState.openPropertyId,
      uiState.searchQuery,
      setEditingCell,
      isCellEditing,
      setOpenRecordId,
      setOpenPropertyId,
      setSearchQuery,
      pushPanel,
      popPanel,
      resetPanel,
      setActiveView,
      addView,
      updateView,
      deleteView,
      duplicateView,
      attrs.locked,
      toggleLock,
      setLocked,
      uiState.viewOptionsOpen,
      setViewOptionsOpen,
      openViewOptionsAt,
    ],
  );
}
