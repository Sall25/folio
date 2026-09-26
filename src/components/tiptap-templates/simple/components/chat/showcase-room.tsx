import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-location";
import {
  Database,
  Flame,
  LayoutGrid,
  List as ListIcon,
  LogOut,
  Plus,
  Sparkles,
  SquareKanban,
  UserPlus,
} from "lucide-react";
import { Avatar } from "src/components/tiptap-ui-primitive/avatar";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { useDataSource } from "src/components/tiptap-node/inline-database/hooks/use-data-source";
import { BoardCardCover } from "src/components/tiptap-node/inline-database/primitives/board-card-cover";
import { getColor } from "src/components/tiptap-node/inline-database/ui/status/status-edit-display/config";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";
import { useJoinChatRoom, useLeaveChatRoom } from "src/hooks/use-chat";
import { useCurrentPerson } from "src/hooks/use-session";
import { showcaseAccess } from "src/hooks/use-create-showcase-source";
import { spaceHomePath, useCurrentSpace } from "src/hooks/use-current-space";
import { useActivePageActions } from "../../context/active-page-context";
import type { RoomShowcase } from "src/api/chat-showcase";
import type {
  ChatRoom,
  Page,
  PersonValue,
  SelectOption,
  StatusItem,
} from "src/types";
import { SHOWCASE_STATUS } from "src/utils/make-showcase-source";
import { ChatModal, InviteToRoomModal } from "./chat-modals";
import "./showcase-room.scss";

type ViewKind = "gallery" | "board" | "feed";
type SortKind = "newest" | "kudos";

const FEATURED_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const FEATURED_MAX = 3;

const pillStyle = (color: string) => ({
  color: `var(--tt-color-text-${color})`,
  background: `color-mix(in srgb, var(--tt-color-text-${color}) 12%, transparent)`,
});

export function ShowcaseRoom({
  room,
  showcase,
}: {
  room: ChatRoom;
  showcase: RoomShowcase;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const space = useCurrentSpace();
  const { person } = useCurrentPerson();
  const { setActivePageId } = useActivePageActions();
  const meId = person?.id;
  const keys = showcase.keys;

  const { source, resolvedRecords, isLoading, setCellValue, addRecordAsync } =
    useDataSource(showcase.sourceId);

  const isMember = room.members.some((m) => m.personId === meId);
  const isOwner = room.members.some(
    (m) => m.personId === meId && m.role === "owner",
  );
  const join = useJoinChatRoom();
  const leave = useLeaveChatRoom();
  const teamspaceId = space.kind === "teamspace" ? space.id : null;

  const [view, setView] = useState<ViewKind>("gallery");
  const [sort, setSort] = useState<SortKind>("newest");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // ── Schema pieces (by handle, never by name) ───────────────────────────
  const tagOptions = useMemo<SelectOption[]>(() => {
    const cfg = source?.properties.find((p) => p.id === keys.tags)?.config;
    return cfg?.type === "multi_select" ? cfg.options : [];
  }, [source, keys.tags]);

  const statusItems = useMemo<StatusItem[]>(() => {
    const cfg = source?.properties.find((p) => p.id === keys.status)?.config;
    return cfg?.type === "status" ? cfg.groups.flatMap((g) => g.items) : [];
  }, [source, keys.status]);

  const statusById = useMemo(
    () => new Map(statusItems.map((s) => [s.id, s])),
    [statusItems],
  );

  // ── Cell readers ───────────────────────────────────────────────────────
  const kudosOf = (r: Page) =>
    (r.values?.[keys.kudos] as PersonValue[] | undefined) ?? [];
  const authorOf = (r: Page) =>
    ((r.values?.[keys.author] as PersonValue[] | undefined) ?? [])[0];
  const tagsOf = (r: Page) =>
    (r.values?.[keys.tags] as SelectOption[] | undefined) ?? [];
  const statusOf = (r: Page) =>
    (r.values?.[keys.status] as string | null | undefined) ?? null;
  const descriptionOf = (r: Page) =>
    (r.values?.[keys.description] as string | undefined) ?? "";

  // ── Filter + sort ──────────────────────────────────────────────────────
  const entries = useMemo(() => {
    const live = resolvedRecords.filter((r) => r.deletedAt == null);
    const filtered = tagFilter
      ? live.filter((r) => tagsOf(r).some((o) => o.id === tagFilter))
      : live;
    return [...filtered].sort((a, b) =>
      sort === "kudos"
        ? kudosOf(b).length - kudosOf(a).length || b.createdAt - a.createdAt
        : b.createdAt - a.createdAt,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedRecords, tagFilter, sort, keys]);

  const featured = useMemo(() => {
    const since = Date.now() - FEATURED_WINDOW_MS;
    return resolvedRecords
      .filter(
        (r) =>
          r.deletedAt == null && r.createdAt >= since && kudosOf(r).length > 0,
      )
      .sort((a, b) => kudosOf(b).length - kudosOf(a).length)
      .slice(0, FEATURED_MAX);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedRecords, keys]);

  // ── Celebrate entries that move to Shipped (yours or anyone's) ─────────
  const prevStatus = useRef<Map<string, string | null> | null>(null);
  useEffect(() => {
    const next = new Map(resolvedRecords.map((r) => [r.id, statusOf(r)]));
    const prev = prevStatus.current;
    prevStatus.current = next;
    if (!prev) return; // first load: nothing to celebrate
    const shipped = resolvedRecords.find(
      (r) =>
        next.get(r.id) === SHOWCASE_STATUS.shipped &&
        prev.has(r.id) &&
        prev.get(r.id) !== SHOWCASE_STATUS.shipped,
    );
    if (!shipped) return;
    setToast(
      t("chat.showcase.shippedToast", {
        title: shipped.title || t("page.untitled"),
        defaultValue: "🎉 {{title}} shipped!",
      }),
    );
    const id = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedRecords, keys.status]);

  // ── Actions ────────────────────────────────────────────────────────────
  const me: PersonValue | null = person
    ? {
        id: person.id,
        name: person.name,
        avatarUrl: person.avatarUrl ?? undefined,
      }
    : null;

  const toggleKudos = (r: Page) => {
    if (!me || !isMember) return;
    const list = kudosOf(r);
    const mine = list.some((p) => p.id === me.id);
    setCellValue(
      r.id,
      keys.kudos,
      mine ? list.filter((p) => p.id !== me.id) : [...list, me],
    );
  };

  const canEditEntry = (r: Page) =>
    isMember && (authorOf(r)?.id === meId || isOwner);

  const setStatus = (r: Page, statusId: string) =>
    setCellValue(r.id, keys.status, statusId);

  const openEntry = (r: Page) => setActivePageId(r.id);

  // One patch writes the new entry's cells and opens it to the room's
  // audience (rows don't rely on inheriting the container's general access).
  const patchRow = usePatchPage(({ id, patch }) => patchPage(id, patch));
  const shareEntry = async (draft: ShareDraft) => {
    if (!me) return;
    const row = await addRecordAsync({ title: draft.title });
    const access = showcaseAccess(room.teamspaceId);
    await patchRow.mutateAsync({
      id: row.id,
      patch: {
        values: {
          ...(row.values ?? {}),
          [keys.description]: draft.description,
          [keys.tags]: draft.tags,
          [keys.status]: draft.statusId,
          [keys.author]: [me],
          [keys.projectPage]: draft.link,
          [keys.kudos]: [],
        },
        generalAccess: access.generalAccess,
        generalAccessRole: access.generalAccessRole,
      },
    });
  };

  const onLeave = () =>
    leave.mutate(room.id, {
      onSuccess: () => navigate({ to: spaceHomePath(teamspaceId) }),
    });

  // ── Rendering ──────────────────────────────────────────────────────────
  const title = room.name ?? t("chat.showcase.defaultName", "Showcase");

  const card = (r: Page) => (
    <EntryCard
      key={r.id}
      record={r}
      author={authorOf(r)}
      tags={tagsOf(r)}
      status={statusById.get(statusOf(r) ?? "")}
      statusItems={statusItems}
      kudos={kudosOf(r)}
      meId={meId}
      canKudos={isMember}
      canEdit={canEditEntry(r)}
      onOpen={() => openEntry(r)}
      onKudos={() => toggleKudos(r)}
      onStatus={(id) => setStatus(r, id)}
    />
  );

  return (
    <div className="chat-room-shell">
      <div className="chat-room sc-room">
        <header className="chat-room__header">
          <span className="chat-room__icon">
            <Sparkles size={16} />
          </span>
          <div className="chat-room__heading">
            <h1 className="chat-room__title">{title}</h1>
            <span className="chat-room__meta">
              {t("chat.showcase.entryCount", {
                count: entries.length,
                defaultValue: "{{count}} entries",
              })}
              {" · "}
              {t("chat.memberCount", {
                count: room.members.length,
                defaultValue: "{{count}} members",
              })}
            </span>
          </div>
          <div className="chat-room__actions">
            {source?.pageId && (
              <Button
                variant="ghost"
                tooltip={t("chat.showcase.openDatabase", "Open as database")}
                onClick={() => setActivePageId(source.pageId)}
              >
                <Database className="tiptap-button-icon" />
              </Button>
            )}
            {isMember && (
              <>
                <Button
                  variant="ghost"
                  tooltip={t("chat.invite", "Invite")}
                  onClick={() => setInviteOpen(true)}
                >
                  <UserPlus className="tiptap-button-icon" />
                </Button>
                <Button
                  variant="ghost"
                  tooltip={t("chat.leave", "Leave room")}
                  onClick={onLeave}
                >
                  <LogOut className="tiptap-button-icon" />
                </Button>
                <Button variant="primary" onClick={() => setShareOpen(true)}>
                  <Plus className="tiptap-button-icon" />
                  <span className="tiptap-button-text">
                    {t("chat.showcase.share", "Share your work")}
                  </span>
                </Button>
              </>
            )}
          </div>
        </header>

        <div className="sc-toolbar">
          <div className="sc-column">
            <div className="sc-toolbar__row">
              <div className="sc-seg" role="tablist">
                {(
                  [
                    ["gallery", LayoutGrid, "Gallery"],
                    ["board", SquareKanban, "Board"],
                    ["feed", ListIcon, "Feed"],
                  ] as const
                ).map(([kind, Icon, fallback]) => (
                  <button
                    key={kind}
                    type="button"
                    role="tab"
                    aria-selected={view === kind}
                    className={`sc-seg__btn${view === kind ? " is-on" : ""}`}
                    onClick={() => setView(kind)}
                  >
                    <Icon size={14} />
                    {t(`chat.showcase.views.${kind}`, fallback)}
                  </button>
                ))}
              </div>
              <select
                className="sc-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKind)}
                aria-label={t("chat.showcase.sortBy", "Sort by")}
              >
                <option value="newest">
                  {t("chat.showcase.sortNewest", "Newest")}
                </option>
                <option value="kudos">
                  {t("chat.showcase.sortKudos", "Most kudos")}
                </option>
              </select>
            </div>
            <div className="sc-filters">
              <button
                type="button"
                className={`sc-chip${tagFilter === null ? " is-on" : ""}`}
                onClick={() => setTagFilter(null)}
              >
                {t("chat.showcase.allTags", "All")}
              </button>
              {tagOptions.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={`sc-chip${tagFilter === o.id ? " is-on" : ""}`}
                  onClick={() => setTagFilter(tagFilter === o.id ? null : o.id)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="sc-body">
          <div className="sc-column">
            {featured.length > 0 && view !== "board" && !tagFilter && (
              <section className="sc-featured">
                <h2 className="sc-section-title">
                  <Flame size={14} />
                  {t("chat.showcase.featured", "Featured this week")}
                </h2>
                <div className="sc-featured__row">{featured.map(card)}</div>
              </section>
            )}

            {isLoading ? (
              <div className="sc-empty">{t("chat.loading", "Loading…")}</div>
            ) : !source ? (
              <div className="sc-empty">
                {t(
                  "chat.showcase.missing",
                  "This showcase's database was deleted or you don't have access to it.",
                )}
              </div>
            ) : entries.length === 0 ? (
              <div className="sc-empty">
                <Sparkles size={22} />
                <p>
                  {tagFilter
                    ? t(
                        "chat.showcase.emptyFiltered",
                        "Nothing with this tag yet.",
                      )
                    : t(
                        "chat.showcase.empty",
                        "Nothing shared yet. Show what you're working on — ideas count too.",
                      )}
                </p>
              </div>
            ) : view === "gallery" ? (
              <div className="sc-gallery">{entries.map(card)}</div>
            ) : view === "board" ? (
              <div className="sc-board">
                {statusItems.map((s) => {
                  const col = entries.filter((r) => statusOf(r) === s.id);
                  return (
                    <div key={s.id} className="sc-board__col">
                      <div className="sc-board__head">
                        <span
                          className="sc-dot"
                          style={{ background: getColor(s.color).dot }}
                        />
                        {s.name}
                        <span className="sc-board__count">{col.length}</span>
                      </div>
                      <div className="sc-board__cards">{col.map(card)}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="sc-feed">
                {entries.map((r) => {
                  const author = authorOf(r);
                  const shipped = statusOf(r) === SHOWCASE_STATUS.shipped;
                  return (
                    <div key={r.id} className="sc-feed__item">
                      <div className="sc-feed__by">
                        <Avatar
                          size="sm"
                          src={author?.avatarUrl}
                          name={author?.name ?? "?"}
                        />
                        <span>
                          <strong>
                            {author?.name ?? t("chat.someone", "someone")}
                          </strong>{" "}
                          {shipped
                            ? t("chat.showcase.feedShipped", "shipped")
                            : t("chat.showcase.feedShared", "shared")}
                        </span>
                        <span className="sc-feed__time">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {card(r)}
                      {descriptionOf(r) && (
                        <p className="sc-feed__desc">{descriptionOf(r)}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {!isMember && (
          <div className="chat-room__bottom">
            <div className="chat-join">
              <span>
                {t(
                  "chat.showcase.viewing",
                  "Join to share your work and give kudos.",
                )}
              </span>
              <Button
                variant="primary"
                disabled={join.isPending}
                onClick={() => join.mutate(room.id)}
              >
                <span className="tiptap-button-text">
                  {t("chat.join", "Join room")}
                </span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {toast && <div className="sc-toast">{toast}</div>}

      {shareOpen && me && (
        <ShareEntryModal
          tagOptions={tagOptions}
          statusItems={statusItems}
          onClose={() => setShareOpen(false)}
          onShare={shareEntry}
        />
      )}

      {inviteOpen && (
        <InviteToRoomModal room={room} onClose={() => setInviteOpen(false)} />
      )}
    </div>
  );
}

// ── Entry card ────────────────────────────────────────────────────────────
function EntryCard({
  record,
  author,
  tags,
  status,
  statusItems,
  kudos,
  meId,
  canKudos,
  canEdit,
  onOpen,
  onKudos,
  onStatus,
}: {
  record: Page;
  author: PersonValue | undefined;
  tags: SelectOption[];
  status: StatusItem | undefined;
  statusItems: StatusItem[];
  kudos: PersonValue[];
  meId: string | undefined;
  canKudos: boolean;
  canEdit: boolean;
  onOpen: () => void;
  onKudos: () => void;
  onStatus: (statusId: string) => void;
}) {
  const { t } = useTranslation();
  const mine = kudos.some((p) => p.id === meId);

  return (
    <article className="sc-card">
      <button type="button" className="sc-card__open" onClick={onOpen}>
        <BoardCardCover page={record} recordId={record.id} height={120} />
        <span className="sc-card__title">
          {record.title || t("page.untitled")}
        </span>
      </button>

      <div className="sc-card__meta">
        <Avatar size="sm" src={author?.avatarUrl} name={author?.name ?? "?"} />
        <span className="sc-card__author">
          {author?.name ?? t("chat.someone", "someone")}
        </span>
      </div>

      {tags.length > 0 && (
        <div className="sc-card__tags">
          {tags.map((o) => (
            <span key={o.id} className="sc-pill" style={pillStyle(o.color)}>
              {o.label}
            </span>
          ))}
        </div>
      )}

      <div className="sc-card__foot">
        {canEdit ? (
          <select
            className="sc-status-select"
            value={status?.id ?? ""}
            onChange={(e) => onStatus(e.target.value)}
            aria-label={t("chat.showcase.props.status", "Status")}
            style={status ? pillStyle(status.color) : undefined}
          >
            {!status && <option value="">—</option>}
            {statusItems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        ) : status ? (
          <span className="sc-pill" style={pillStyle(status.color)}>
            {status.name}
          </span>
        ) : (
          <span />
        )}

        <button
          type="button"
          className={`sc-kudos${mine ? " is-mine" : ""}`}
          disabled={!canKudos}
          title={kudos.map((p) => p.name).join(", ")}
          aria-pressed={mine}
          onClick={onKudos}
        >
          🔥 <span>{kudos.length}</span>
        </button>
      </div>
    </article>
  );
}

// ── Share your work ───────────────────────────────────────────────────────
interface ShareDraft {
  title: string;
  description: string;
  tags: SelectOption[];
  statusId: string;
  link: string;
}

function ShareEntryModal({
  tagOptions,
  statusItems,
  onClose,
  onShare,
}: {
  tagOptions: SelectOption[];
  statusItems: StatusItem[];
  onClose: () => void;
  onShare: (draft: ShareDraft) => Promise<void>;
}) {
  const { t } = useTranslation();
  const defaultStatus =
    statusItems.find((s) => s.id === SHOWCASE_STATUS.inProgress)?.id ??
    statusItems[0]?.id ??
    "";
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagIds, setTagIds] = useState<Set<string>>(new Set());
  const [statusId, setStatusId] = useState(defaultStatus);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim().length > 0 && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await onShare({
        title: title.trim(),
        description: description.trim(),
        tags: tagOptions.filter((o) => tagIds.has(o.id)),
        statusId,
        link: link.trim(),
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const toggleTag = (id: string) =>
    setTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <ChatModal
      title={t("chat.showcase.share", "Share your work")}
      onClose={onClose}
      footer={
        <>
          {error && <span className="chm__error">{error}</span>}
          <Button variant="primary" disabled={!canSubmit} onClick={submit}>
            <span className="tiptap-button-text">
              {busy
                ? t("chat.showcase.posting", "Posting…")
                : t("chat.showcase.post", "Post")}
            </span>
          </Button>
        </>
      }
    >
      <label className="chm-field">
        <span className="chm-field__label">
          {t("chat.showcase.props.title", "Title")}
        </span>
        <input
          autoFocus
          className="chm-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t(
            "chat.showcase.titlePlaceholder",
            "What are you working on?",
          )}
        />
      </label>

      <label className="chm-field">
        <span className="chm-field__label">
          {t("chat.showcase.props.description", "Description")}
        </span>
        <textarea
          className="chm-input sc-textarea"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t(
            "chat.showcase.descriptionPlaceholder",
            "What you tried, and what feedback you'd like.",
          )}
        />
      </label>

      {tagOptions.length > 0 && (
        <div className="chm-field">
          <span className="chm-field__label">
            {t("chat.showcase.props.tags", "Tags")}
          </span>
          <div className="sc-filters">
            {tagOptions.map((o) => (
              <button
                key={o.id}
                type="button"
                className={`sc-chip${tagIds.has(o.id) ? " is-on" : ""}`}
                onClick={() => toggleTag(o.id)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chm-field">
        <span className="chm-field__label">
          {t("chat.showcase.props.status", "Status")}
        </span>
        <div className="sc-filters">
          {statusItems.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`sc-chip${statusId === s.id ? " is-on" : ""}`}
              onClick={() => setStatusId(s.id)}
            >
              <span
                className="sc-dot"
                style={{ background: getColor(s.color).dot }}
              />
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <label className="chm-field">
        <span className="chm-field__label">
          {t("chat.showcase.props.projectPage", "Project page")}
        </span>
        <input
          className="chm-input"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://…"
        />
      </label>
    </ChatModal>
  );
}