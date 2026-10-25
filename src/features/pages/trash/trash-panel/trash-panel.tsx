import { useTranslation } from "react-i18next";
import { Trash2, RotateCcw, FileText } from "src/components/icons";
import {
  useTrashedPages,
  useRestorePage,
  useDeletePagePermanently,
  useEmptyTrash,
  useTrashScope,
} from "src/hooks/use-trash";
import "./trash-panel.scss";
import { PageItemIcon } from "../../page-item/page-item-icon";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { useCallback, useState } from "react";
import { type ID, type Page } from "src/types";
import { ConfirmDialog } from "../../../shell/confirm-dialog";

// Trash view: lists trashed pages (subtree roots) with restore / delete
// permanently, and an empty-all action. Rendered in the sidebar like the inbox.
export function TrashPanel() {
  const { t } = useTranslation();
  const { data: trashed = [] } = useTrashedPages();
  const restore = useRestorePage();
  const purge = useDeletePagePermanently();
  const emptyAll = useEmptyTrash();
  const { canPurge } = useTrashScope();

  // Show only trashed ROOTS (a trashed child is covered by its trashed parent).
  const trashedIds = new Set((trashed as Page[]).map((p) => p.id));
  const roots = (trashed as Page[]).filter(
    (p) => !p.parentId || !trashedIds.has(p.parentId),
  );

  // Inside a teamspace you can only hard-delete your own pages; the server
  // would silently skip the others, so their button isn't offered.
  const purgeable = roots.filter(canPurge);
  const someNotPurgeable = purgeable.length < roots.length;

  // One dialog for both actions: a single page, or emptying the trash.
  const [confirm, setConfirm] = useState<
    { kind: "page"; id: ID } | { kind: "empty" } | null
  >(null);
  const handleConfirm = () => {
    if (confirm?.kind === "page") purge.mutate(confirm.id);
    if (confirm?.kind === "empty") emptyAll.mutate();
    setConfirm(null);
  };
  const pendingPage =
    confirm?.kind === "page" ? roots.find((p) => p.id === confirm.id) : null;
  const onCancel = useCallback(() => setConfirm(null), []);
  const untitled = t("page.untitled", "Untitled");

  return (
    <>
      <div className="trash-panel">
        <div className="trash-panel__header">
          <span className="trash-panel__title">
            {roots.length > 0 && (
              <>
                {t("trash.title", "Trash")}
                <span className="trash-panel__count">{roots.length}</span>
              </>
            )}
          </span>
          {purgeable.length > 0 && (
            <Button
              type="button"
              size="small"
              className="trash-panel__empty"
              onClick={() => setConfirm({ kind: "empty" })}
            >
              <Trash2 className="tiptap-button-icon" size={13} />
              <span className="tiptap-button-text">
                {t("trash.empty", "Empty")}
              </span>
            </Button>
          )}
        </div>

        <div className="trash-panel__body">
          {roots.length === 0 ? (
            <div className="trash-panel__empty-state">
              <Trash2 size={26} strokeWidth={1.5} />
              <p>{t("trash.emptyState", "Trash is empty")}</p>
            </div>
          ) : (
            roots.map((page) => (
              <div key={page.id} className="trash-item">
                <span className="trash-item__icon">
                  {page.cover.iconName ? (
                    <PageItemIcon cover={page.cover} />
                  ) : (
                    <FileText size={15} />
                  )}
                </span>
                <span className="trash-item__title">
                  {page.title || t("page.untitled", "Untitled")}
                </span>
                <div className="trash-item__actions">
                  <Button
                    type="button"
                    size="small"
                    className="trash-item__btn"
                    tooltip={t("trash.restore", "Restore")}
                    onClick={() => restore.mutate(page.id)}
                  >
                    <RotateCcw className="tiptap-button-icon" size={14} />
                  </Button>
                  {canPurge(page) && (
                    <Button
                      type="button"
                      size="small"
                      className="trash-item__btn trash-item__btn--danger"
                      tooltip={t("trash.deleteForever", "Delete permanently")}
                      onClick={(e) => {
                        e.stopPropagation();
                        const id = page.id;
                        requestAnimationFrame(() =>
                          setConfirm({ kind: "page", id }),
                        );
                      }}
                    >
                      <Trash2 className="tiptap-button-icon" size={14} />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirm != null}
        message={
          <>
            {confirm?.kind === "empty"
              ? t("trash.confirmEmpty", { count: purgeable.length })
              : t("trash.confirmDelete", {
                  title: pendingPage?.title || untitled,
                })}
            <br />
            <span style={{ fontSize: 13, opacity: 0.7 }}>
              {confirm?.kind === "empty" && someNotPurgeable
                ? t("trash.ownOnlyNote")
                : t("trash.confirmNote")}
            </span>
          </>
        }
        confirmLabel={t("trash.deleteForever", "Delete permanently")}
        cancelLabel={t("actions.cancel", "Cancel")}
        onCancel={onCancel}
        onConfirm={handleConfirm}
      />
    </>
  );
}
