import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-location";
import { useTranslation } from "react-i18next";
import {
  ArrowRightLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Palette,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from "src/components/icons";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { useGroups } from "src/hooks/use-groups";
import { useManageTeamspaces } from "src/hooks/use-teamspaces";
import { usePagesByCategory } from "src/hooks/use-pages";
import { useTeamspaceMemberList } from "src/hooks/use-teamspace-members";
import { PageItemIcon } from "../../../pages/page-item/page-item-icon";
import { CreateTeamspaceModal } from "../create-teamspace-modal";
import { TeamspaceMembersModal } from "../teamspace-members/teamspace-members-modal";
import {
  attachedGroups,
  effectiveMemberCount,
  type Page,
  type Teamspace,
  type TeamspaceAccess,
  type Workspace,
} from "src/types";
import { memberCount, type Group } from "src/types";
import { ConfirmDialog } from "src/features/shell/confirm-dialog";
import { useToast } from "src/features/shell/toast";
import { useCurrentSpace } from "src/hooks/use-current-space";
import {
  useCurrentWorkspace,
  useOwnedWorkspaces,
} from "src/hooks/use-workspaces";
import { useCurrentPerson } from "src/hooks/use-session";
import { AccentSwatches } from "src/components/accent-swatches/accent-swatches";
import { teamspaceTint } from "src/lib/teamspace-color";
import "./teamspace-settings-content.scss";

// Popovers here open inside the workspace settings modal (z-index 701) —
// they must sit above it.
const POPOVER_Z = 1000;

// name/icon live on the PAGE (joined to the record by shared id).
const nameOf = (page: Page | undefined, fallback: string) =>
  page?.title || fallback;

function Avatar({
  person,
  size = 22,
}: {
  person: { name: string; avatarUrl?: string | null };
  size?: number;
}) {
  const initial = (person.name || "?").trim().charAt(0).toUpperCase();
  return person.avatarUrl ? (
    <img
      className="ts-avatar"
      src={person.avatarUrl}
      alt=""
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className="ts-avatar ts-avatar--initial"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {initial}
    </span>
  );
}

function AccessSelect({
  value,
  onChange,
}: {
  value: TeamspaceAccess;
  onChange: (a: TeamspaceAccess) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const accessLabel = (a: TeamspaceAccess) => t(`teamspaces.access.${a}`);
  const options: TeamspaceAccess[] = ["open", "closed", "private"];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="ts-access">
          {accessLabel(value)}
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" style={{ zIndex: POPOVER_Z }}>
        <Card style={{ padding: 4, minWidth: 160 }}>
          {options.map((a) => (
            <Button
              key={a}
              variant="ghost"
              style={{ justifyContent: "flex-start", width: "100%" }}
              onClick={() => {
                onChange(a);
                setOpen(false);
              }}
            >
              <span className="tiptap-button-text">{accessLabel(a)}</span>
            </Button>
          ))}
        </Card>
      </PopoverContent>
    </Popover>
  );
}

// Attach GROUPS to a teamspace.
function GroupPicker({
  ts,
  groups,
  onAttach,
  onDetach,
}: {
  ts: Teamspace;
  groups: Group[];
  onAttach: (id: string, groupId: string) => void;
  onDetach: (id: string, groupId: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const candidates = !q
    ? groups
    : groups.filter((g) => g.name.toLowerCase().includes(q));
  const toggle = (gid: string) =>
    ts.groupIds.includes(gid) ? onDetach(ts.id, gid) : onAttach(ts.id, gid);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="ts-add">
          <Plus size={14} />
          <span>{t("teamspaces.attachGroup")}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" style={{ zIndex: POPOVER_Z }}>
        <Card style={{ padding: "5px 10px", minWidth: 260 }}>
          <div className="ts-picker-search">
            <Search size={13} style={{ opacity: 0.6 }} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("teamspaces.searchGroupsPlaceholder")}
            />
          </div>
          <div className="ts-picker-list">
            {candidates.length === 0 ? (
              <span className="ts-picker-empty">
                {t("teamspaces.noGroups")}
              </span>
            ) : (
              candidates.map((g) => {
                const selected = ts.groupIds.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    className="ts-picker-row"
                    onClick={() => toggle(g.id)}
                  >
                    <span className="ts-picker-row__icon">
                      {g.icon ? g.icon : <Users size={14} />}
                    </span>
                    <span className="ts-picker-row__text">
                      <span className="ts-picker-row__name">{g.name}</span>
                      <span className="ts-picker-row__sub">
                        {t("teamspaces.memberCount", {
                          count: memberCount(g),
                        })}
                      </span>
                    </span>
                    {selected && (
                      <Check
                        size={15}
                        style={{ color: "var(--tt-brand-color-400)" }}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </Card>
      </PopoverContent>
    </Popover>
  );
}

// Members of a teamspace — from ANY workspace (resolved via the membership
// hook, not this workspace's people list). All changes happen in the members
// modal, which sits above the settings modal.
function MembersSection({ ts }: { ts: Teamspace }) {
  const { t } = useTranslation();
  const { members, isLoading } = useTeamspaceMemberList(ts.id);
  const [open, setOpen] = useState(false);

  return (
    <div className="ts-detail__section">
      <div className="ts-detail__label">{t("teamspaces.members")}</div>
      {isLoading ? null : members.length === 0 ? (
        <span className="ts-detail__empty">
          {t("teamspaces.noDirectMembers")}
        </span>
      ) : (
        members.map(({ person, isOwner }) => (
          <div className="ts-detail__row" key={person.id}>
            <Avatar person={person} size={20} />
            <span className="ts-detail__name">{person.name}</span>
            <span className="ts-detail__sub">
              {isOwner
                ? t("members.owner", "Owner")
                : t("members.member", "Member")}
            </span>
          </div>
        ))
      )}
      <button type="button" className="ts-add" onClick={() => setOpen(true)}>
        <UserPlus size={14} />
        <span>{t("members.manage", "Manage members")}</span>
      </button>

      {open && (
        <TeamspaceMembersModal
          teamspaceId={ts.id}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function TeamspaceRow({
  ts,
  page,
  groups,
  onRename,
  onSetAccess,
  onSetColor,
  onDelete,
  moveTargets,
  onMove,
  onAttachGroup,
  onDetachGroup,
}: {
  ts: Teamspace;
  page: Page | undefined;
  groups: Group[];
  onRename: (id: string, name: string) => void;
  onSetAccess: (id: string, a: TeamspaceAccess) => void;
  /** null = automatic (the icon's colour). */
  onSetColor: (id: string, color: string | null) => void;
  onDelete: (id: string) => void | Promise<void>;
  /** Other workspaces you own — where this teamspace can be moved. */
  moveTargets: Workspace[];
  onMove: (id: string, workspace: Workspace) => void | Promise<void>;
  onAttachGroup: (id: string, groupId: string) => void;
  onDetachGroup: (id: string, groupId: string) => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // The ••• menu's other pages: the workspaces to move to, the colour.
  const [menuView, setMenuView] = useState<"main" | "move" | "color">("main");
  const { person } = useCurrentPerson();
  // Only the teamspace's owners can change it (teamspaces_update policy).
  const isTsOwner = !!person && ts.ownerIds.includes(person.id);
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const closeConfirm = useCallback(() => setConfirmDelete(false), []);
  const name = nameOf(page, t("teamspaces.untitled"));
  const [draft, setDraft] = useState(name);

  const attached = attachedGroups(ts, groups);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== name) onRename(ts.id, next);
    else setDraft(name);
    setRenaming(false);
  };

  return (
    <>
      <div className="ts-row">
        <button
          type="button"
          className="ts-row__expand"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? t("actions.collapse") : t("actions.expand")}
        >
          <ChevronRight
            size={14}
            style={{
              transform: expanded ? "rotate(90deg)" : "none",
              transition: "transform 150ms ease",
            }}
          />
        </button>

        <div className="ts-row__name-cell">
          <span className="ts-row__icon">
            {page ? (
              <PageItemIcon
                cover={page.cover}
                styles={{ width: 15, height: 15, fontSize: 15 }}
              />
            ) : null}
          </span>
          {renaming ? (
            <input
              autoFocus
              className="ts-row__rename"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") {
                  setDraft(name);
                  setRenaming(false);
                }
              }}
            />
          ) : (
            <span className="ts-row__name">{name}</span>
          )}
        </div>

        <span className="ts-row__access">
          <AccessSelect
            value={ts.access}
            onChange={(a) => onSetAccess(ts.id, a)}
          />
        </span>

        <span className="ts-row__members">
          {t("teamspaces.memberCount", {
            count: effectiveMemberCount(ts, groups),
          })}
        </span>

        <Popover
          open={menuOpen}
          onOpenChange={(open) => {
            setMenuOpen(open);
            if (!open) setMenuView("main");
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="ts-row__menu"
              aria-label={t("actions.more")}
            >
              <MoreHorizontal size={16} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="end"
            style={{ zIndex: POPOVER_Z }}
          >
            <Card style={{ padding: 4, minWidth: 200 }}>
              {menuView === "color" ? (
                <>
                  <Button
                    variant="ghost"
                    style={{ justifyContent: "flex-start", width: "100%" }}
                    onClick={() => setMenuView("main")}
                  >
                    <ChevronLeft className="tiptap-button-icon" size={14} />
                    <span className="tiptap-button-text">
                      {t("teamspaces.color", "Colour")}
                    </span>
                  </Button>
                  <div style={{ padding: "8px 10px 10px", maxWidth: 220 }}>
                    <AccentSwatches
                      value={ts.accentColor ?? null}
                      onChange={(c) => onSetColor(ts.id, c)}
                      autoLabel={t("teamspaces.colorAuto", "Match icon")}
                    />
                  </div>
                </>
              ) : menuView === "move" ? (
                <>
                  <Button
                    variant="ghost"
                    style={{ justifyContent: "flex-start", width: "100%" }}
                    onClick={() => setMenuView("main")}
                  >
                    <ChevronLeft className="tiptap-button-icon" size={14} />
                    <span className="tiptap-button-text">
                      {t("teamspaces.moveToWorkspace")}
                    </span>
                  </Button>
                  {moveTargets.length === 0 ? (
                    <div
                      style={{
                        padding: "6px 10px 8px",
                        fontSize: 12.5,
                        maxWidth: 220,
                        color:
                          "color-mix(in srgb, var(--tt-text-primary) 55%, transparent)",
                      }}
                    >
                      {t("teamspaces.noOtherWorkspaces")}
                    </div>
                  ) : (
                    moveTargets.map((w) => (
                      <Button
                        key={w.id}
                        variant="ghost"
                        style={{ justifyContent: "flex-start", width: "100%" }}
                        onClick={() => {
                          setMenuOpen(false);
                          setMenuView("main");
                          void onMove(ts.id, w);
                        }}
                      >
                        <span className="tiptap-button-text">
                          {w.name || t("teamspaces.untitled")}
                        </span>
                      </Button>
                    ))
                  )}
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    style={{ justifyContent: "flex-start", width: "100%" }}
                    onClick={() => {
                      setMenuOpen(false);
                      setDraft(name);
                      setRenaming(true);
                    }}
                  >
                    <span className="tiptap-button-text">
                      {t("actions.rename")}
                    </span>
                  </Button>
                  {isTsOwner && (
                    <Button
                      variant="ghost"
                      style={{ justifyContent: "flex-start", width: "100%" }}
                      onClick={() => setMenuView("color")}
                    >
                      <Palette className="tiptap-button-icon" size={14} />
                      <span className="tiptap-button-text">
                        {t("teamspaces.color", "Colour")}
                      </span>
                      {page && (
                        <span
                          aria-hidden
                          style={{
                            marginLeft: "auto",
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: teamspaceTint(page, ts.accentColor),
                          }}
                        />
                      )}
                      <ChevronRight
                        className="tiptap-button-icon"
                        size={14}
                        style={page ? undefined : { marginLeft: "auto" }}
                      />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    style={{ justifyContent: "flex-start", width: "100%" }}
                    onClick={() => setMenuView("move")}
                  >
                    <ArrowRightLeft className="tiptap-button-icon" size={14} />
                    <span className="tiptap-button-text">
                      {t("teamspaces.moveToWorkspace")}
                    </span>
                    <ChevronRight
                      className="tiptap-button-icon"
                      size={14}
                      style={{ marginLeft: "auto" }}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    style={{
                      justifyContent: "flex-start",
                      width: "100%",
                      color: "var(--tt-danger-color, #e5484d)",
                    }}
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmDelete(true);
                    }}
                  >
                    <Trash2 className="tiptap-button-icon" size={14} />
                    <span className="tiptap-button-text">
                      {t("actions.delete")}
                    </span>
                  </Button>
                </>
              )}
            </Card>
          </PopoverContent>
        </Popover>
      </div>

      {expanded && (
        <div className="ts-detail">
          <MembersSection ts={ts} />

          {/* Attached groups */}
          <div className="ts-detail__section">
            <div className="ts-detail__label">{t("teamspaces.groups")}</div>
            {attached.length === 0 ? (
              <span className="ts-detail__empty">
                {t("teamspaces.noAttachedGroups")}
              </span>
            ) : (
              attached.map((g) => (
                <div className="ts-detail__row" key={g.id}>
                  <span className="ts-detail__group-icon">
                    {g.icon ? g.icon : <Users size={14} />}
                  </span>
                  <span className="ts-detail__name">{g.name}</span>
                  <span className="ts-detail__sub">
                    {t("teamspaces.memberCount", { count: memberCount(g) })}
                  </span>
                  <button
                    type="button"
                    className="ts-detail__remove"
                    aria-label={t("teamspaces.detachGroup", { name: g.name })}
                    onClick={() => onDetachGroup(ts.id, g.id)}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))
            )}
            <GroupPicker
              ts={ts}
              groups={groups}
              onAttach={onAttachGroup}
              onDetach={onDetachGroup}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        message={
          <>
            {t("teamspaces.deleteConfirmTitle", { name })}
            <br />
            <span style={{ fontSize: 13, opacity: 0.7 }}>
              {t("teamspaces.deleteConfirmBody")}
            </span>
          </>
        }
        confirmLabel={t("teamspaces.deleteConfirmAction")}
        cancelLabel={t("actions.cancel", "Cancel")}
        onCancel={closeConfirm}
        onConfirm={() => {
          setConfirmDelete(false);
          void onDelete(ts.id);
        }}
      />
    </>
  );
}

export function TeamspacesSettingsContent() {
  const { t } = useTranslation();
  const { data: groups = [] } = useGroups();
  const { data: teamspacePages = [] } = usePagesByCategory("Teamspaces");
  const {
    teamspaces,
    renameTeamspaceAsync,
    setAccessAsync,
    deleteTeamspaceAsync,
    moveTeamspaceAsync,
    attachGroupAsync,
    detachGroupAsync,
    setAccentColorAsync,
  } = useManageTeamspaces();

  const [createOpen, setCreateOpen] = useState(false);
  const space = useCurrentSpace();
  const navigate = useNavigate();
  const { show } = useToast();
  const { workspaceId } = useCurrentWorkspace();
  const { workspaces: owned } = useOwnedWorkspaces();
  const moveTargets = useMemo(
    () => (owned as Workspace[]).filter((w) => w.id !== workspaceId),
    [owned, workspaceId],
  );

  // After the move the teamspace belongs to the other workspace, so it
  // leaves this one; step out of it first if we're inside.
  const handleMove = async (id: string, target: Workspace) => {
    if (space.kind === "teamspace" && space.id === id) navigate({ to: "/" });
    try {
      await moveTeamspaceAsync(id, target.id);
      show(t("teamspaces.moved", { name: target.name }), "success");
    } catch (err) {
      show(
        err instanceof Error && err.message
          ? err.message
          : t("teamspaces.moveFailed"),
        "error",
      );
    }
  };

  // Leave the teamspace first if we're in it, so nothing renders from a
  // teamspace that's about to disappear.
  const handleDelete = async (id: string) => {
    if (space.kind === "teamspace" && space.id === id) navigate({ to: "/" });
    try {
      await deleteTeamspaceAsync(id);
      show(t("teamspaces.deleted"), "success");
    } catch (err) {
      show(
        err instanceof Error && err.message
          ? err.message
          : t("teamspaces.deleteFailed"),
        "error",
      );
    }
  };

  const pagesById = useMemo(() => {
    const m = new Map<string, Page>();
    for (const p of teamspacePages as Page[]) m.set(p.id, p);
    return m;
  }, [teamspacePages]);

  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const untitled = t("teamspaces.untitled");
  const filtered = (
    !q
      ? teamspaces
      : (teamspaces as Teamspace[]).filter((ts) =>
          nameOf(pagesById.get(ts.id), untitled).toLowerCase().includes(q),
        )
  ) as Teamspace[];

  return (
    <div className="teamspaces-settings">
      <div className="ts-toolbar">
        <div className="ts-search">
          <Search size={14} style={{ opacity: 0.6 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("teamspaces.searchPlaceholder")}
          />
        </div>
        <Button onClick={() => setCreateOpen(true)} style={{ flexShrink: 0 }}>
          <Plus className="tiptap-button-icon" size={14} />
          <span className="tiptap-button-text">
            {t("teamspaces.createTeamspace")}
          </span>
        </Button>
      </div>

      <div className="ts-table">
        <div className="ts-table__head">
          <span className="ts-col ts-col--expand" />
          <span className="ts-col">{t("teamspaces.columns.teamspace")}</span>
          <span className="ts-col">{t("teamspaces.columns.access")}</span>
          <span className="ts-col">{t("teamspaces.columns.members")}</span>
          <span className="ts-col ts-col--menu" />
        </div>
        {filtered.length === 0 ? (
          <div className="ts-empty">{t("teamspaces.empty")}</div>
        ) : (
          filtered.map((ts) => (
            <TeamspaceRow
              key={ts.id}
              ts={ts}
              page={pagesById.get(ts.id)}
              groups={groups as Group[]}
              onRename={renameTeamspaceAsync}
              onSetAccess={setAccessAsync}
              onSetColor={setAccentColorAsync}
              onDelete={handleDelete}
              moveTargets={moveTargets}
              onMove={handleMove}
              onAttachGroup={attachGroupAsync}
              onDetachGroup={detachGroupAsync}
            />
          ))
        )}
      </div>

      {createOpen && (
        <CreateTeamspaceModal onClose={() => setCreateOpen(false)} />
      )}
    </div>
  );
}
