import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-location";
import { Mail, UserPlus, X } from "lucide-react";
import { Avatar } from "src/components/tiptap-ui-primitive/avatar";
import { usePeople } from "src/hooks/use-people";
import { useCurrentPerson } from "src/hooks/use-session";
import { useCurrentWorkspace } from "src/hooks/use-workspaces";
import { useCurrentSpace } from "src/hooks/use-current-space";
import { useEnterableTeamspaces } from "src/hooks/use-enterable-teamspaces";
import {
  useAddTeamspaceMember,
  useInviteToTeamspace,
  useRemoveTeamspaceMember,
  useRevokeInvite,
  useSetTeamspaceOwner,
  useTeamspaceInvites,
  useTeamspaceMemberList,
} from "src/hooks/use-teamspace-members";
import { formatRelativeTime } from "src/utils/format-relative";
import type { Person } from "src/types";
import "../chat/chat-modals.scss";
import "./teamspace-members-modal.scss";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Members of one teamspace: add from the host workspace, invite anyone by
// email, change roles, remove, leave, and (owners) see pending invites.
// Every change goes through the owner-checked membership RPCs.
export function TeamspaceMembersModal({
  teamspaceId,
  onClose,
}: {
  teamspaceId: string;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const space = useCurrentSpace();
  const { person } = useCurrentPerson();
  const { workspaceId } = useCurrentWorkspace();
  const { data: people = [] } = usePeople();
  const enterable = useEnterableTeamspaces();
  const entry = enterable.find((e) => e.page.id === teamspaceId);
  const hostWs = entry?.page.workspaceId ?? null;

  const { members, isOwner, ownerCount, isLoading } =
    useTeamspaceMemberList(teamspaceId);
  const { invites } = useTeamspaceInvites(isOwner ? teamspaceId : null);

  const add = useAddTeamspaceMember();
  const invite = useInviteToTeamspace();
  const remove = useRemoveTeamspaceMember();
  const setOwner = useSetTeamspaceOwner();
  const revoke = useRevokeInvite();

  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

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

  const memberIds = useMemo(
    () => new Set(members.map((m) => m.person.id)),
    [members],
  );

  // Direct add is only possible from the teamspace's host workspace (the
  // server enforces the same rule); everyone else is invited by email.
  const canAddFromWorkspace =
    isOwner && hostWs != null && hostWs === workspaceId;

  const q = query.trim().toLowerCase();
  const suggestions = useMemo(
    () =>
      canAddFromWorkspace && q
        ? (people as Person[])
            .filter(
              (p) =>
                !memberIds.has(p.id) &&
                (p.name.toLowerCase().includes(q) ||
                  p.email.toLowerCase().includes(q)),
            )
            .slice(0, 6)
        : [],
    [canAddFromWorkspace, q, people, memberIds],
  );
  const isEmail = EMAIL_RE.test(query.trim());

  const error =
    add.error?.message ??
    invite.error?.message ??
    remove.error?.message ??
    setOwner.error?.message ??
    revoke.error?.message ??
    null;

  const addPerson = (personId: string) => {
    setNotice(null);
    add.mutate({ teamspaceId, personId }, { onSuccess: () => setQuery("") });
  };

  const sendInvite = () => {
    const email = query.trim();
    if (!EMAIL_RE.test(email)) return;
    setNotice(null);
    invite.mutate(
      { teamspaceId, email },
      {
        onSuccess: () => {
          // Same message whether or not the email has an account.
          setNotice(
            t("members.inviteSent", {
              email,
              defaultValue: "Invitation sent to {{email}}.",
            }),
          );
          setQuery("");
        },
      },
    );
  };

  const leave = () => {
    if (!person) return;
    remove.mutate(
      { teamspaceId, personId: person.id },
      {
        onSuccess: () => {
          onClose();
          if (space.kind === "teamspace" && space.id === teamspaceId) {
            navigate({ to: "/" });
          }
        },
      },
    );
  };

  const title = entry?.page.title || t("teamspaces.untitled");

  return createPortal(
    <div className="chm-backdrop" role="presentation" onClick={onClose}>
      <div
        className="chm tmm"
        role="dialog"
        aria-modal="true"
        aria-label={t("members.title", "Members")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="chm__head">
          <div className="tmm__heading">
            <h2 className="chm__title">{t("members.title", "Members")}</h2>
            <span className="tmm__sub">
              {title} · {t("teamspaces.memberCount", { count: members.length })}
            </span>
          </div>
          <button
            type="button"
            className="chm__close"
            aria-label={t("actions.close", "Close")}
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </div>

        <div className="chm__body">
          {/* ── Add / invite (owners) ───────────────────────────────── */}
          {isOwner && (
            <div className="tmm-add">
              <input
                autoFocus
                className="chm-input"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setNotice(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isEmail) sendInvite();
                }}
                placeholder={
                  canAddFromWorkspace
                    ? t(
                        "members.addPlaceholder",
                        "Add people or invite by email",
                      )
                    : t("members.invitePlaceholder", "Invite by email")
                }
              />

              {(suggestions.length > 0 || isEmail) && (
                <div className="tmm-suggest">
                  {suggestions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="tmm-suggest__row"
                      disabled={add.isPending}
                      onClick={() => addPerson(p.id)}
                    >
                      <Avatar
                        size="sm"
                        src={p.avatarUrl ?? undefined}
                        name={p.name}
                      />
                      <span className="tmm-suggest__text">
                        <span className="tmm-suggest__name">{p.name}</span>
                        <span className="tmm-suggest__sub">{p.email}</span>
                      </span>
                      <UserPlus size={14} className="tmm-suggest__icon" />
                    </button>
                  ))}
                  {isEmail && (
                    <button
                      type="button"
                      className="tmm-suggest__row"
                      disabled={invite.isPending}
                      onClick={sendInvite}
                    >
                      <span className="tmm-suggest__mail">
                        <Mail size={14} />
                      </span>
                      <span className="tmm-suggest__text">
                        <span className="tmm-suggest__name">
                          {t("members.inviteEmail", {
                            email: query.trim(),
                            defaultValue: "Invite {{email}}",
                          })}
                        </span>
                        <span className="tmm-suggest__sub">
                          {t(
                            "members.inviteHint",
                            "They'll see the invitation when they sign in.",
                          )}
                        </span>
                      </span>
                    </button>
                  )}
                </div>
              )}

              {notice && <div className="tmm-notice">{notice}</div>}
            </div>
          )}

          {error && <div className="tmm-error">{error}</div>}

          {/* ── Members ─────────────────────────────────────────────── */}
          <div className="tmm-label">{t("members.members", "Members")}</div>
          {isLoading ? (
            <div className="tmm-empty">{t("chat.loading", "Loading…")}</div>
          ) : (
            members.map(({ person: m, isOwner: memberIsOwner }) => {
              const isMe = m.id === person?.id;
              const lastOwner = memberIsOwner && ownerCount <= 1;
              return (
                <div key={m.id} className="tmm-member">
                  <Avatar
                    size="sm"
                    src={m.avatarUrl ?? undefined}
                    name={m.name}
                  />
                  <span className="tmm-member__name">
                    {m.name}
                    {isMe && (
                      <span className="tmm-member__you">
                        {" "}
                        {t("members.you", "(you)")}
                      </span>
                    )}
                  </span>
                  <span
                    className={`tmm-role${memberIsOwner ? " is-owner" : ""}`}
                  >
                    {memberIsOwner
                      ? t("members.owner", "Owner")
                      : t("members.member", "Member")}
                  </span>

                  <div className="tmm-member__actions">
                    {isOwner && !isMe && (
                      <>
                        <button
                          type="button"
                          className="tmm-action"
                          disabled={lastOwner || setOwner.isPending}
                          title={
                            lastOwner
                              ? t(
                                  "members.lastOwner",
                                  "A teamspace needs at least one owner",
                                )
                              : undefined
                          }
                          onClick={() =>
                            setOwner.mutate({
                              teamspaceId,
                              personId: m.id,
                              owner: !memberIsOwner,
                            })
                          }
                        >
                          {memberIsOwner
                            ? t("members.removeOwner", "Remove owner")
                            : t("members.makeOwner", "Make owner")}
                        </button>
                        <button
                          type="button"
                          className="tmm-action tmm-action--danger"
                          disabled={lastOwner || remove.isPending}
                          onClick={() =>
                            remove.mutate({ teamspaceId, personId: m.id })
                          }
                        >
                          {t("members.remove", "Remove")}
                        </button>
                      </>
                    )}
                    {isMe && (
                      <button
                        type="button"
                        className="tmm-action tmm-action--danger"
                        disabled={lastOwner || remove.isPending}
                        title={
                          lastOwner
                            ? t(
                                "members.lastOwnerLeave",
                                "Make someone else an owner before leaving",
                              )
                            : undefined
                        }
                        onClick={leave}
                      >
                        {t("members.leave", "Leave")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* ── Pending invites (owners) ────────────────────────────── */}
          {isOwner && invites.length > 0 && (
            <>
              <div className="tmm-label">
                {t("members.pending", "Pending invitations")}
              </div>
              {invites.map((inv) => (
                <div key={inv.id} className="tmm-member">
                  <span className="tmm-suggest__mail">
                    <Mail size={14} />
                  </span>
                  <span className="tmm-member__name">
                    {inv.email}
                    <span className="tmm-member__meta">
                      {formatRelativeTime(inv.createdAt, t, i18n.language)}
                    </span>
                  </span>
                  <div className="tmm-member__actions tmm-member__actions--always">
                    <button
                      type="button"
                      className="tmm-action"
                      disabled={revoke.isPending}
                      onClick={() => revoke.mutate(inv.id)}
                    >
                      {t("members.revoke", "Revoke")}
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
