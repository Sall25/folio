import { CircleAlert, Clock, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  deleteOutboxMessage,
  retryOutboxMessage,
  type OutboxMessage,
} from "src/lib/chat-outbox";
import { requestSyncNow } from "src/lib/sync-status";
import "./outbox-note.scss";

// Under a message written offline (chat-outbox.ts): its files, and whether
// it's waiting to be sent or was refused — then with Retry and Delete.
export function OutboxNote({ entry }: { entry: OutboxMessage }) {
  const { t } = useTranslation();
  const failed = entry.status === "failed";

  return (
    <div className="chat-outbox-note">
      {entry.files.length > 0 && (
        <ul className="chat-outbox-note__files">
          {entry.files.map((f) => (
            <li key={f.id}>
              <FileText size={13} aria-hidden />
              <span>{f.name}</span>
            </li>
          ))}
        </ul>
      )}
      {failed ? (
        <div className="chat-outbox-note__status is-failed" role="alert">
          <CircleAlert size={13} aria-hidden />
          <span>{t("chat.outbox.failed")}</span>
          <button
            type="button"
            onClick={() => {
              void retryOutboxMessage(entry.id).then(requestSyncNow);
            }}
          >
            {t("chat.outbox.retry")}
          </button>
          <button
            type="button"
            onClick={() => void deleteOutboxMessage(entry.id)}
          >
            {t("chat.outbox.delete")}
          </button>
        </div>
      ) : (
        <div className="chat-outbox-note__status" role="status">
          <Clock size={13} aria-hidden />
          <span>
            {entry.status === "sending"
              ? t("chat.outbox.sending")
              : t("chat.outbox.waiting")}
          </span>
        </div>
      )}
    </div>
  );
}
