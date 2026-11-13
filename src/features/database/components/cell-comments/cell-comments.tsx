import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageSquareText, Plus } from "src/components/icons";
import type { ID, Thread } from "src/types";
import { useThreadsBase } from "src/hooks/use-threads";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverPortal,
} from "src/components/tiptap-ui-primitive/popover";
import { Card } from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  PageCommentComposer,
  PageThread,
} from "src/features/comments/page-comment-node/page-comment-view";
import "./cell-comments.scss";

const live = (t: Thread) => t.status !== "deleted" && t.status !== "drafted";

/** Comments on one cell: a small count on the cell when it has some, and a
 *  popover by the cell with its discussions and a new one. Each comment is a
 *  page-level thread on the row's page, tagged with the property, so the row
 *  page shows it too ("on Status"). */
export function CellComments({
  recordId,
  propertyId,
  open,
  onOpenChange,
}: {
  recordId: ID;
  propertyId: ID;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  // One query for every thread (shared by all cells); each cell keeps its own.
  const select = useCallback(
    (threads: Thread[]) =>
      threads.filter(
        (th) =>
          th.pageId === recordId && th.propertyId === propertyId && live(th),
      ),
    [recordId, propertyId],
  );
  const { data: threads = [] } = useThreadsBase(select);
  const openThreads = threads.filter((th) => th.status !== "resolved");
  const resolved = threads.filter((th) => th.status === "resolved");
  const [composing, setComposing] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const composerShown = composing || openThreads.length === 0;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setComposing(false);
          setShowResolved(false);
        }
      }}
    >
      {/* The whole cell is the anchor: the popover opens below it. The
          count is on it so the stylesheet can mark a commented cell's
          value, the way commented text is marked. */}
      <PopoverAnchor asChild>
        <span
          className="db-cell-comments__anchor"
          data-count={openThreads.length || undefined}
          aria-hidden
        />
      </PopoverAnchor>

      {openThreads.length > 0 && !open && (
        <button
          type="button"
          className="db-cell-comments__badge"
          aria-label={t("comments.cellCount", { count: openThreads.length })}
          title={t("comments.cellCount", { count: openThreads.length })}
          contentEditable={false}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            onOpenChange(true);
          }}
        >
          <MessageSquareText size={11} aria-hidden />
          {openThreads.length}
        </button>
      )}

      <PopoverPortal container={document.getElementById("root")}>
        <PopoverContent
          side="bottom"
          align="start"
          sideOffset={4}
          collisionPadding={12}
          className="db-cell-comments"
          style={{ zIndex: 999 }}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Card className="db-cell-comments__card">
            {openThreads.map((thread) => (
              <PageThread key={thread.id} thread={thread} />
            ))}

            {composerShown ? (
              <PageCommentComposer
                pageId={recordId}
                propertyId={propertyId}
                onDone={() => setComposing(false)}
              />
            ) : (
              <Button
                variant="ghost"
                size="small"
                className="db-cell-comments__new"
                onClick={() => setComposing(true)}
              >
                <Plus className="tiptap-button-icon" size={14} />
                <span className="tiptap-button-text">
                  {t("comments.newDiscussion")}
                </span>
              </Button>
            )}

            {resolved.length > 0 && (
              <>
                <button
                  type="button"
                  className="db-cell-comments__resolved"
                  onClick={() => setShowResolved((v) => !v)}
                >
                  {showResolved
                    ? t("comments.hideResolved", "Hide resolved comments")
                    : t("comments.showResolved", {
                        count: resolved.length,
                        defaultValue: "{{count}} resolved comments",
                      })}
                </button>
                {showResolved &&
                  resolved.map((thread) => (
                    <PageThread key={thread.id} thread={thread} />
                  ))}
              </>
            )}
          </Card>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
}
