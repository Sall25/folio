import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { FileText, Hash, Lock, MessagesSquare, X } from "lucide-react";
import { useChatRooms } from "src/hooks/use-chat";
import { useCurrentPerson } from "src/hooks/use-session";
import {
  clearDiscussRequest,
  pageChatKey,
  setPendingBlock,
  useDiscussRequest,
} from "./block-share-store";
import { setPageChatOpen } from "./page-chat-store";
import { useOpenChatRoom } from "./chat-utils";
import "./chat-blocks.scss";

// Destination picker for "Discuss in chat…": this page's discussion, or a
// room you've joined in the current space. Mounted once (AppOverlays).
export function DiscussBlockHost() {
  const { t } = useTranslation();
  const draft = useDiscussRequest();
  const { person } = useCurrentPerson();
  const { rooms } = useChatRooms();
  const openRoom = useOpenChatRoom();

  const joined = useMemo(
    () => rooms.filter((r) => r.members.some((m) => m.personId === person?.id)),
    [rooms, person?.id],
  );

  useEffect(() => {
    if (!draft) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearDiscussRequest();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draft]);

  if (!draft) return null;

  const toPageDiscussion = () => {
    setPendingBlock(pageChatKey(draft.pageId), draft);
    setPageChatOpen(true);
    clearDiscussRequest();
  };

  const toRoom = (roomId: string) => {
    const room = joined.find((r) => r.id === roomId);
    if (!room) return;
    setPendingBlock(room.id, draft);
    openRoom(room);
    clearDiscussRequest();
  };

  return createPortal(
    <div className="dbd-backdrop" onMouseDown={clearDiscussRequest}>
      <div
        className="dbd"
        role="dialog"
        aria-modal="true"
        aria-label={t("chat.discussBlock", "Discuss this block")}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="dbd__head">
          <span className="dbd__title">
            {t("chat.discussBlock", "Discuss this block")}
          </span>
          <button
            type="button"
            className="dbd__close"
            aria-label={t("actions.close", "Close")}
            onClick={clearDiscussRequest}
          >
            <X size={15} />
          </button>
        </header>

        <div className="chat-block-card is-static">
          <span className="chat-block-card__src">
            <FileText size={12} />
            {draft.pageTitle || t("page.untitled")}
          </span>
          <span className="chat-block-card__text">{draft.snapshot}</span>
        </div>

        <div className="dbd__label">{t("chat.sendTo", "Send to")}</div>
        <button type="button" className="dbd__row" onClick={toPageDiscussion}>
          <MessagesSquare size={15} />
          <span>{t("chat.thisPageDiscussion", "This page's discussion")}</span>
        </button>

        {joined.length > 0 && (
          <>
            <div className="dbd__label">{t("chat.rooms", "Rooms")}</div>
            <div className="dbd__list">
              {joined.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  className="dbd__row"
                  onClick={() => toRoom(room.id)}
                >
                  {room.visibility === "private" ? (
                    <Lock size={14} />
                  ) : (
                    <Hash size={15} />
                  )}
                  <span>
                    {room.name || t("chat.untitledRoom", "Untitled room")}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
