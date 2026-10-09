import { useTranslation } from "react-i18next";
import { Check, ExternalLink, FileText, MessagesSquare, X } from "lucide-react";
import { Card, CardBody } from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { useNotifications } from "src/features/inbox/notification/notification-context";
import { formatRelativeTime } from "src/utils/format-relative";
import type { Notification } from "src/types";
import type { ReactNode } from "react";
import "./notification-card.scss";

/**
 * A notification in full, on the side card that opens when it's hovered in
 * the inbox (the list only shows a preview): what kind it is, when, the
 * whole message, where it comes from, and what to do with it.
 */
export function NotificationCard({
  notification: n,
  icon,
  onOpen,
  onClose,
}: {
  notification: Notification;
  icon: ReactNode;
  /** Opens what the notification points at (same as clicking it). */
  onOpen: () => void;
  /** Closes the card. */
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { markRead, dismiss } = useNotifications();
  const isChat = n.type === "chat-mention";

  return (
    <Card className="notification-card">
      <CardBody>
        <div className="notification-card__head">
          <span className="notification-card__icon">{icon}</span>
          <span className="notification-card__kind">
            {t(`inbox.kind.${n.type}`)}
          </span>
          <span className="notification-card__time">
            {formatRelativeTime(n.timestamp.getTime(), t, i18n.language)}
          </span>
        </div>

        <div>
          <div className="notification-card__title">{n.title}</div>
          <div className="notification-card__date">
            {n.timestamp.toLocaleString(i18n.language, {
              dateStyle: "full",
              timeStyle: "short",
            })}
          </div>
        </div>
        {n.message && (
          <div className="notification-card__message">{n.message}</div>
        )}

        {n.sourcePageTitle && (
          <div className="notification-card__source">
            {isChat ? <MessagesSquare size={13} /> : <FileText size={13} />}
            <span>{n.sourcePageTitle}</span>
          </div>
        )}

        <Separator orientation="horizontal" />

        <div className="notification-card__actions">
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              onClose();
              onOpen();
            }}
          >
            <ExternalLink className="tiptap-button-icon" />
            <span className="tiptap-button-text">{t("inbox.card.open")}</span>
          </Button>
          {!n.read && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => markRead(n.id)}
            >
              <Check className="tiptap-button-icon" />
              <span className="tiptap-button-text">
                {t("inbox.card.markRead")}
              </span>
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onClose();
              dismiss(n.id);
            }}
          >
            <X className="tiptap-button-icon" />
            <span className="tiptap-button-text">
              {t("inbox.card.dismiss")}
            </span>
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
