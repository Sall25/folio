import { useTranslation } from "react-i18next";
import { Trash2, RotateCcw, FileText } from "lucide-react";
import {
  useTrashedPages,
  useRestorePage,
  useDeletePagePermanently,
  useEmptyTrash,
} from "src/hooks/use-trash";
import "./trash-panel.scss";
import { PageItemIcon } from "../../page-item-icon";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { useState } from "react";
import { type ID } from "src/types";
import { DeletePageDialog } from "../delete-page-dialog";

// Trash view: lists trashed pages (subtree roots) with restore / delete
// permanently, and an empty-all action. Rendered in the sidebar like the inbox.
export function TrashPanel() {
  const { t } = useTranslation();
  const { data: trashed = [] } = useTrashedPages();
  const restore = useRestorePage();
  const purge = useDeletePagePermanently();
  const emptyAll = useEmptyTrash();

  // Show only trashed ROOTS (a trashed child is covered by its trashed parent).
  const trashedIds = new Set(trashed.map((p) => p.id));
  const roots = trashed.filter(
    (p) => !p.parentId || !trashedIds.has(p.parentId),
  );

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pageId, setPageId] = useState<ID | null>(null);
  const handleConfirmDelete = () => {
    if (pageId) purge.mutate(pageId);
    setConfirmOpen(false);
  };
  const pendingPage = roots.find((p) => p.id === pageId);

  return (
    <>
      <div className="trash-panel">
        <div className="trash-panel__header">
          <span className="trash-panel__title">
            {t("trash.title", "Trash")}
            {roots.length > 0 && (
              <span className="trash-panel__count">{roots.length}</span>
            )}
          </span>
          {roots.length > 0 && (
            <Button
              type="button"
              size="small"
              className="trash-panel__empty"
              onClick={() => emptyAll.mutate()}
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
                  <Button
                    type="button"
                    size="small"
                    className="trash-item__btn trash-item__btn--danger"
                    tooltip={t("trash.deleteForever", "Delete permanently")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPageId(page.id);
                      requestAnimationFrame(() => setConfirmOpen(true));
                    }}
                  >
                    <Trash2 className="tiptap-button-icon" size={14} />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <DeletePageDialog
        open={confirmOpen}
        pageTitle={pendingPage?.title || t("page.untitled", "Untitled")}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
