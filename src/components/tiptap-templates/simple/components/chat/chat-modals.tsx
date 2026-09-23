import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Check, Hash, Lock, X } from "lucide-react";
import { Avatar } from "src/components/tiptap-ui-primitive/avatar";
import { Button } from "src/components/tiptap-ui-primitive/button";
import type { ChatPerson, ChatRoom, ChatVisibility } from "src/types";
import {
  useAddChatMembers,
  useCreateChatRoom,
  useOpenDm,
} from "src/hooks/use-chat";
import { useChatCandidates } from "src/hooks/use-chat-candidates";
import { useOpenChatRoom } from "./chat-utils";
import "./chat-modals.scss";
import { useCurrentSpace } from "src/hooks/use-current-space";

// ── Shell ─────────────────────────────────────────────────────────────────
function ChatModal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="chm-backdrop" role="presentation" onClick={onClose}>
      <div
        className="chm"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="chm__head">
          <h2 className="chm__title">{title}</h2>
          <button
            type="button"
            className="chm__close"
            aria-label={t("actions.close", "Close")}
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </div>
        <div className="chm__body">{children}</div>
        <div className="chm__footer">{footer}</div>
      </div>
    </div>,
    document.body,
  );
}

// ── People picker ─────────────────────────────────────────────────────────
function PeoplePicker({
  candidates,
  selected,
  onToggle,
  isLoading,
}: {
  candidates: ChatPerson[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q
    ? candidates.filter((p) => p.name.toLowerCase().includes(q))
    : candidates;

  return (
    <div className="chm-people">
      <input
        className="chm-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("chat.searchPeople", "Search people")}
      />
      <div className="chm-people__list">
        {isLoading ? (
          <div className="chm-people__empty">
            {t("chat.loading", "Loading…")}
          </div>
        ) : shown.length === 0 ? (
          <div className="chm-people__empty">
            {candidates.length === 0
              ? t("chat.noOneToAdd", "No one else to add here yet.")
              : t("chat.noMatch", "No one matches that name.")}
          </div>
        ) : (
          shown.map((p) => {
            const on = selected.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                className={`chm-person${on ? " is-on" : ""}`}
                onClick={() => onToggle(p.id)}
              >
                <Avatar
                  size="sm"
                  src={p.avatarUrl ?? undefined}
                  name={p.name}
                />
                <span className="chm-person__name">{p.name}</span>
                <span className="chm-person__check">
                  {on && <Check size={14} />}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function useSelection(single = false) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setSelected((prev) => {
      if (single) return prev.has(id) ? new Set() : new Set([id]);
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return { selected, toggle };
}

// ── Create room ───────────────────────────────────────────────────────────
export function CreateRoomModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<ChatVisibility>("open");
  const { selected, toggle } = useSelection();
  const { candidates, isLoading } = useChatCandidates("room");
  const create = useCreateChatRoom();
  const openRoom = useOpenChatRoom();

  const canSubmit = name.trim().length > 0 && !create.isPending;

  const space = useCurrentSpace();

  const submit = async () => {
    if (!canSubmit) return;
    try {
      const id = await create.mutateAsync({
        name: name.trim().replace(/^#/, ""),
        visibility,
        memberIds: [...selected],
      });
      openRoom({
        id,
        kind: "room",
        teamspaceId: space.kind === "teamspace" ? space.id : null,
      });
      onClose();
    } catch {
      /* keep open so the user can retry */
    }
  };

  return (
    <ChatModal
      title={t("chat.newRoom", "New room")}
      onClose={onClose}
      footer={
        <>
          {create.error && (
            <span className="chm__error">{create.error.message}</span>
          )}
          <Button variant="primary" disabled={!canSubmit} onClick={submit}>
            <span className="tiptap-button-text">
              {create.isPending
                ? t("chat.creating", "Creating…")
                : t("chat.createRoom", "Create room")}
            </span>
          </Button>
        </>
      }
    >
      <label className="chm-field">
        <span className="chm-field__label">{t("chat.roomName", "Name")}</span>
        <div className="chm-input chm-input--with-icon">
          <Hash size={14} />
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={t("chat.roomNamePlaceholder", "study-group")}
          />
        </div>
      </label>

      <div className="chm-field">
        <span className="chm-field__label">
          {t("chat.visibility", "Who can join")}
        </span>
        <div className="chm-seg">
          <button
            type="button"
            className={`chm-seg__opt${visibility === "open" ? " is-on" : ""}`}
            onClick={() => setVisibility("open")}
          >
            <Hash size={14} />
            <span>
              <strong>{t("chat.open", "Open")}</strong>
              <small>{t("chat.openDesc", "Anyone in this space")}</small>
            </span>
          </button>
          <button
            type="button"
            className={`chm-seg__opt${visibility === "private" ? " is-on" : ""}`}
            onClick={() => setVisibility("private")}
          >
            <Lock size={14} />
            <span>
              <strong>{t("chat.private", "Private")}</strong>
              <small>{t("chat.privateDesc", "Only people you invite")}</small>
            </span>
          </button>
        </div>
      </div>

      <div className="chm-field">
        <span className="chm-field__label">
          {t("chat.addPeople", "Add people")}
          {selected.size > 0 && ` · ${selected.size}`}
        </span>
        <PeoplePicker
          candidates={candidates}
          selected={selected}
          onToggle={toggle}
          isLoading={isLoading}
        />
      </div>
    </ChatModal>
  );
}

// ── Invite to an existing room ────────────────────────────────────────────
export function InviteToRoomModal({
  room,
  onClose,
}: {
  room: ChatRoom;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const existing = useMemo(
    () => room.members.map((m) => m.personId),
    [room.members],
  );
  const { selected, toggle } = useSelection();
  const { candidates, isLoading } = useChatCandidates("room", existing);
  const add = useAddChatMembers();

  const submit = async () => {
    if (!selected.size) return;
    try {
      await add.mutateAsync({ roomId: room.id, memberIds: [...selected] });
      onClose();
    } catch {
      /* keep open */
    }
  };

  return (
    <ChatModal
      title={t("chat.inviteTo", {
        name: room.name ?? "",
        defaultValue: "Invite to #{{name}}",
      })}
      onClose={onClose}
      footer={
        <>
          {add.error && <span className="chm__error">{add.error.message}</span>}
          <Button
            variant="primary"
            disabled={!selected.size || add.isPending}
            onClick={submit}
          >
            <span className="tiptap-button-text">
              {t("chat.invite", "Invite")}
              {selected.size > 0 && ` (${selected.size})`}
            </span>
          </Button>
        </>
      }
    >
      <PeoplePicker
        candidates={candidates}
        selected={selected}
        onToggle={toggle}
        isLoading={isLoading}
      />
    </ChatModal>
  );
}

// ── New direct message ────────────────────────────────────────────────────
export function NewDmModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { selected, toggle } = useSelection(true);
  const { candidates, isLoading } = useChatCandidates("dm");
  const openDm = useOpenDm();
  const openRoom = useOpenChatRoom();

  const submit = async () => {
    const [other] = [...selected];
    if (!other) return;
    try {
      const id = await openDm.mutateAsync(other);
      openRoom({ id, kind: "dm", teamspaceId: null });
      onClose();
    } catch {
      /* keep open */
    }
  };

  return (
    <ChatModal
      title={t("chat.newMessage", "New message")}
      onClose={onClose}
      footer={
        <>
          {openDm.error && (
            <span className="chm__error">{openDm.error.message}</span>
          )}
          <Button
            variant="primary"
            disabled={!selected.size || openDm.isPending}
            onClick={submit}
          >
            <span className="tiptap-button-text">
              {t("chat.message", "Message")}
            </span>
          </Button>
        </>
      }
    >
      <PeoplePicker
        candidates={candidates}
        selected={selected}
        onToggle={toggle}
        isLoading={isLoading}
      />
    </ChatModal>
  );
}
