import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "src/components/icons";
import { Button } from "src/components/tiptap-ui-primitive/button";
import "./invite-mention-panel.scss";

// "Invite…" in the @ menu: invite people by email, as members of the
// workspace or as guests, then mention them where "@" was typed.
//
// Drawn on its own (not by the menu, which closes when it's chosen) and
// placed at the caret. The invite itself goes through the workspace invite
// (editor.storage.mention.invite, set by useMentionData).

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const splitEmails = (text: string) =>
  text
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter(Boolean);

export function InviteMentionPanel({
  editor,
  pos,
  initialEmail,
  onClose,
}: {
  editor: Editor;
  pos: number;
  initialEmail: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [emails, setEmails] = useState(initialEmail);
  const [role, setRole] = useState<"member" | "guest">("member");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const list = splitEmails(emails);
  const valid = list.length > 0 && list.every((e) => EMAIL.test(e));

  const invite = async () => {
    const send = editor.storage.mention?.invite;
    if (!valid || !send) return;
    setSending(true);
    setError(false);
    try {
      await send(list, role);
      if (!editor.isDestroyed) {
        // Mention each invited person by their address until they join.
        const at = Math.min(pos, editor.state.doc.content.size);
        editor
          .chain()
          .focus()
          .insertContentAt(
            at,
            list.flatMap((email) => [
              {
                type: "mention",
                attrs: {
                  id: email,
                  label: email,
                  mentionSuggestionChar: "@",
                  nodeId: `mention-${Date.now()}-${email}`,
                },
              },
              { type: "text", text: " " },
            ]),
          )
          .run();
      }
      onClose();
    } catch (err) {
      console.error("Invite failed", err);
      setError(true);
      setSending(false);
    }
  };

  return (
    <div
      className="invite-mention"
      role="dialog"
      aria-label={t("mention.invite")}
    >
      <div className="invite-mention__head">
        <button
          type="button"
          className="invite-mention__back"
          onClick={onClose}
          aria-label={t("mention.back")}
        >
          <ArrowLeft />
        </button>
        <span>{t("mention.inviteTitle")}</span>
      </div>
      <div className="invite-mention__body">
        <input
          ref={inputRef}
          className="invite-mention__input"
          placeholder={t("mention.addEmails")}
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void invite();
            }
          }}
        />
        <div className="invite-mention__choices" role="radiogroup">
          {(["member", "guest"] as const).map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={role === r}
              className="invite-mention__choice"
              data-active={role === r || undefined}
              onClick={() => setRole(r)}
            >
              <b>
                {r === "member"
                  ? t("mention.inviteMember")
                  : t("mention.inviteGuest")}
              </b>
              <span>
                {r === "member"
                  ? t("mention.inviteMemberHint")
                  : t("mention.inviteGuestHint")}
              </span>
            </button>
          ))}
        </div>
        {error && (
          <p className="invite-mention__error">{t("mention.inviteFailed")}</p>
        )}
        <Button
          className="invite-mention__submit"
          disabled={!valid || sending}
          onClick={() => void invite()}
        >
          <span className="tiptap-button-text">
            {sending ? t("mention.inviting") : t("mention.inviteButton")}
          </span>
        </Button>
      </div>
    </div>
  );
}
