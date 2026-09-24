import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { MessagesSquare, X } from "lucide-react";
import { useActivePageState } from "../../context/active-page-context";
import { useChatRoom } from "src/hooks/use-chat";
import { usePageChat } from "src/hooks/use-page-chat";
import { setPageChatOpen, usePageChatOpen } from "./page-chat-store";
import { RoomContent } from "./chat-room-view";
import "./page-chat-drawer.scss";

// Right-side drawer with the discussion of the page you're on. Rendered from
// AppOverlays (always mounted); only shows on a page.
export function PageChatDrawer() {
  const { t } = useTranslation();
  const open = usePageChatOpen();
  const { activePageId, activePage } = useActivePageState();
  const visible = open && !!activePageId;

  const { roomId, isLoading, error } = usePageChat(
    visible ? activePageId : null,
  );
  const { room } = useChatRoom(roomId);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) setPageChatOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  if (!visible) return null;

  return createPortal(
    <aside className="pcd" aria-label={t("chat.pageDiscussion", "Discussion")}>
      <header className="pcd__head">
        <MessagesSquare size={16} className="pcd__icon" />
        <div className="pcd__heading">
          <span className="pcd__title">
            {t("chat.pageDiscussion", "Discussion")}
          </span>
          {activePage?.title && (
            <span className="pcd__sub">{activePage.title}</span>
          )}
        </div>
        <button
          type="button"
          className="pcd__close"
          aria-label={t("actions.close", "Close")}
          onClick={() => setPageChatOpen(false)}
        >
          <X size={16} />
        </button>
      </header>

      <div className="pcd__body">
        {error ? (
          <div className="pcd__state">
            {t(
              "chat.pageNoAccess",
              "You don't have access to this page's discussion.",
            )}
          </div>
        ) : isLoading || !room ? (
          <div className="pcd__state">{t("chat.loading", "Loading…")}</div>
        ) : (
          <RoomContent key={room.id} room={room} variant="panel" />
        )}
      </div>
    </aside>,
    document.body,
  );
}
