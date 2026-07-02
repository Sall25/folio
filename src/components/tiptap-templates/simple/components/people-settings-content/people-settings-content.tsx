import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { usePeople } from "src/hooks/use-people";
import { useManageGroups } from "src/hooks/use-groups";
import { useTeamspaces } from "src/hooks/use-teamspaces";
import { useCreateTeamspace } from "src/hooks/use-create-teamspace";
import { useCreatePage } from "src/hooks/use-create-page";
import { useDeleteTeamspace } from "src/hooks/use-delete-teamspace";
import { buildTeamspacePair } from "src/hooks/use-create-teamspace-with-page";
import {
  teamspacesOfGroup,
  membersOf,
  isMember,
  isGuest,
  type Teamspace,
  type Group,
  type Person,
  type ID,
} from "src/types";
import { useWorkspaceSettings } from "src/hooks/use-workspace-settings";
import "./people-settings-content.scss";

type Tab = "members" | "guests" | "groups";

function Avatar({ person, size = 24 }: { person: Person; size?: number }) {
  const initial = (person.name || "?").trim().charAt(0).toUpperCase();
  return person.avatarUrl ? (
    <img
      className="ps-avatar"
      src={person.avatarUrl}
      alt=""
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className="ps-avatar ps-avatar--initial"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {initial}
    </span>
  );
}

function PersonRow({ person }: { person: Person }) {
  const { t } = useTranslation();
  return (
    <div className="ps-person-row">
      <Avatar person={person} />
      <div className="ps-person-row__text">
        <span className="ps-person-row__name">{person.name}</span>
        <span className="ps-person-row__email">{person.email}</span>
      </div>
      <span className="ps-person-row__role">
        {t(`people.roles.${person.role}`, person.role)}
      </span>
    </div>
  );
}

function MemberPicker({
  group,
  people,
  onAddMember,
  onRemoveMember,
}: {
  group: Group;
  people: Person[];
  onAddMember: (groupId: string, personId: string) => void;
  onRemoveMember: (groupId: string, personId: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const candidates = !q
    ? people
    : people.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q),
      );

  const toggle = (personId: string) => {
    if (group.memberIds.includes(personId)) onRemoveMember(group.id, personId);
    else onAddMember(group.id, personId);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="ps-add-members">
          <UserPlus size={14} />
          <span>{t("people.addMembers")}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start">
        <Card style={{ padding: "5px 10px", minWidth: 260 }}>
          <div className="ps-picker-search">
            <Search size={13} style={{ opacity: 0.6 }} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("people.searchPeoplePlaceholder")}
            />
          </div>
          <div className="ps-picker-list">
            {candidates.length === 0 ? (
              <span className="ps-picker-empty">{t("people.noPeople")}</span>
            ) : (
              candidates.map((p) => {
                const selected = group.memberIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    className="ps-picker-row"
                    onClick={() => toggle(p.id)}
                  >
                    <Avatar person={p} size={22} />
                    <span className="ps-picker-row__text">
                      <span className="ps-picker-row__name">{p.name}</span>
                      <span className="ps-picker-row__email">{p.email}</span>
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

function GroupRow({
  group,
  people,
  teamspaces,
  onRename,
  onDelete,
  onCreateTeamspace,
  onAddMember,
  onRemoveMember,
}: {
  group: Group;
  people: Person[];
  teamspaces: Teamspace[];
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onCreateTeamspace: (id: string) => void;
  onAddMember: (groupId: string, personId: string) => void;
  onRemoveMember: (groupId: string, personId: string) => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(group.name);

  const members = useMemo(() => membersOf(group, people), [group, people]);

  const commitRename = () => {
    const name = draft.trim();
    if (name && name !== group.name) onRename(group.id, name);
    else setDraft(group.name);
    setRenaming(false);
  };

  const teamspaceCount = teamspacesOfGroup(group.id, teamspaces).length;

  return (
    <>
      <div className="ps-group-row">
        <button
          type="button"
          className="ps-group-row__expand"
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

        <div className="ps-group-row__name-cell">
          <span className="ps-group-row__icon">
            {group.icon ? group.icon : <Users size={15} />}
          </span>
          {renaming ? (
            <input
              autoFocus
              className="ps-group-row__rename"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setDraft(group.name);
                  setRenaming(false);
                }
              }}
            />
          ) : (
            <span className="ps-group-row__name">{group.name}</span>
          )}
        </div>

        <span className="ps-group-row__teamspaces">
          {teamspaceCount === 0 ? t("people.none") : String(teamspaceCount)}
        </span>

        <span className="ps-group-row__members">
          {t("people.memberCount", { count: group.memberIds.length })}
        </span>

        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="ps-group-row__menu"
              aria-label={t("actions.more")}
            >
              <MoreHorizontal size={16} />
            </button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="end">
            <Card style={{ padding: 4, minWidth: 200 }}>
              <Button
                variant="ghost"
                style={{ justifyContent: "flex-start", width: "100%" }}
                onClick={() => {
                  setMenuOpen(false);
                  setRenaming(true);
                }}
              >
                <span className="tiptap-button-text">
                  {t("actions.rename")}
                </span>
              </Button>
              <Button
                variant="ghost"
                style={{ justifyContent: "flex-start", width: "100%" }}
                onClick={() => {
                  setMenuOpen(false);
                  onCreateTeamspace(group.id);
                }}
              >
                <span className="tiptap-button-text">
                  {t("people.createTeamspaceFromGroup")}
                </span>
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
                  onDelete(group.id);
                }}
              >
                <Trash2 className="tiptap-button-icon" size={14} />
                <span className="tiptap-button-text">
                  {t("actions.delete")}
                </span>
              </Button>
            </Card>
          </PopoverContent>
        </Popover>
      </div>

      {expanded && (
        <div className="ps-group-members">
          {members.length === 0 ? (
            <span className="ps-group-members__empty">
              {t("people.noMembersYet")}
            </span>
          ) : (
            members.map((m) => (
              <div className="ps-group-members__row" key={m.id}>
                <Avatar person={m} size={20} />
                <span className="ps-group-members__name">{m.name}</span>
                <span className="ps-group-members__email">{m.email}</span>
                <button
                  type="button"
                  className="ps-group-members__remove"
                  aria-label={t("people.removePerson", { name: m.name })}
                  onClick={() => onRemoveMember(group.id, m.id)}
                >
                  <X size={13} />
                </button>
              </div>
            ))
          )}
          <MemberPicker
            group={group}
            people={people}
            onAddMember={onAddMember}
            onRemoveMember={onRemoveMember}
          />
        </div>
      )}
    </>
  );
}

export function PeopleSettingsContent() {
  const { t } = useTranslation();
  const { data: people = [] } = usePeople();
  const { data: teamspaces = [] } = useTeamspaces();
  const {
    groups,
    addGroupAsync,
    renameGroupAsync,
    deleteGroupAsync,
    addMemberAsync,
    removeMemberAsync,
  } = useManageGroups();

  // Pair-create pieces: a teamspace is a page + record (shared id). Creating a
  // record alone would orphan it (shows in settings, never in the sidebar).
  const createRecord = useCreateTeamspace();
  const createPageMut = useCreatePage();
  const deleteRecord = useDeleteTeamspace();

  // Derived role buckets. isMember = owner|member; isGuest = guest.
  const members = useMemo(
    () => (people as Person[]).filter(isMember),
    [people],
  );
  const guests = useMemo(() => (people as Person[]).filter(isGuest), [people]);

  const [tab, setTab] = useState<Tab>("members");
  const [query, setQuery] = useState("");

  // Invite link — workspace-level setting, persisted via useWorkspaceSettings.
  const { inviteLink, setInviteEnabledAsync, regenerateInviteAsync } =
    useWorkspaceSettings();
  const inviteEnabled = inviteLink.enabled;
  const inviteUrl = inviteLink.url;

  const q = query.trim().toLowerCase();
  const filterPeople = (list: Person[]) =>
    !q
      ? list
      : list.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.email.toLowerCase().includes(q),
        );
  const filteredGroups = (
    !q
      ? groups
      : (groups as Group[]).filter((g) => g.name.toLowerCase().includes(q))
  ) as Group[];

  const copyInvite = () => navigator.clipboard?.writeText(inviteUrl);

  // Create a teamspace (page + record, shared id) seeded with this group
  // attached — the group's members gain access via effective membership. The
  // name lives on the PAGE (title); the record carries groupIds. Record first,
  // then page, rolling the record back if the page write fails.
  const createFromGroupAsync = async (name: string, groupId: ID) => {
    const { page, record } = buildTeamspacePair({
      name,
      iconName: null,
      iconColor: null,
      description: null,
      access: "open",
    });
    const seeded: Teamspace = { ...record, groupIds: [groupId] };
    await createRecord.mutateAsync(seeded);
    try {
      await createPageMut.mutateAsync(page);
    } catch (err) {
      try {
        await deleteRecord.mutateAsync(seeded.id);
      } catch {
        /* best-effort rollback */
      }
      throw err;
    }
  };

  return (
    <div className="people-settings">
      {/* ── Invite link ──────────────────────────────────────────────── */}
      <div className="ps-invite">
        <div className="ps-invite__head">
          <div>
            <div className="ps-invite__title">{t("people.inviteLink")}</div>
            <div className="ps-invite__desc">{t("people.inviteLinkDesc")}</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={inviteEnabled}
            aria-label={t("people.inviteLink")}
            className={`ps-switch${inviteEnabled ? " is-on" : ""}`}
            onClick={() => setInviteEnabledAsync(!inviteEnabled)}
          >
            <span className="ps-switch__knob" />
          </button>
        </div>

        {inviteEnabled && (
          <>
            <div className="ps-invite__link-row">
              <div className="ps-invite__url">{inviteUrl}</div>
              <Button variant="ghost" onClick={copyInvite}>
                <span className="tiptap-button-text">
                  {t("people.copyLink")}
                </span>
              </Button>
            </div>
            <button
              type="button"
              className="ps-invite__regen"
              onClick={() => regenerateInviteAsync()}
            >
              {t("people.generateNewLink")}
            </button>
          </>
        )}
      </div>

      {/* ── Tabs + search + create ───────────────────────────────────── */}
      <div className="ps-toolbar">
        <div className="ps-tabs">
          <button
            type="button"
            className={`ps-tab${tab === "members" ? " is-active" : ""}`}
            onClick={() => setTab("members")}
          >
            {t("people.tabs.members")}{" "}
            <span className="ps-tab__count">{members.length}</span>
          </button>
          <button
            type="button"
            className={`ps-tab${tab === "guests" ? " is-active" : ""}`}
            onClick={() => setTab("guests")}
          >
            {t("people.tabs.guests")}{" "}
            <span className="ps-tab__count">{guests.length}</span>
          </button>
          <button
            type="button"
            className={`ps-tab${tab === "groups" ? " is-active" : ""}`}
            onClick={() => setTab("groups")}
          >
            {t("people.tabs.groups")}{" "}
            <span className="ps-tab__count">{(groups as Group[]).length}</span>
          </button>
        </div>

        <div className="ps-search">
          <Search size={14} style={{ opacity: 0.6 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("people.searchPlaceholder")}
          />
        </div>

        {tab === "groups" && (
          <Button
            onClick={() => addGroupAsync({ name: t("people.newGroup") })}
            style={{ flexShrink: 0 }}
          >
            <Plus className="tiptap-button-icon" size={14} />
            <span className="tiptap-button-text">
              {t("people.createGroup")}
            </span>
          </Button>
        )}
      </div>

      {/* ── Tab body ─────────────────────────────────────────────────── */}
      {tab !== "groups" ? (
        <div className="ps-people-list">
          {filterPeople(tab === "members" ? members : guests).map((p) => (
            <PersonRow key={p.id} person={p} />
          ))}
        </div>
      ) : (
        <div className="ps-groups">
          <div className="ps-groups__head">
            <span className="ps-groups__col ps-groups__col--name">
              {t("people.columns.group")}
            </span>
            <span className="ps-groups__col">
              {t("people.columns.teamspaces")}
            </span>
            <span className="ps-groups__col">
              {t("people.columns.members")}
            </span>
            <span className="ps-groups__col ps-groups__col--menu" />
          </div>
          {filteredGroups.map((g) => (
            <GroupRow
              key={g.id}
              group={g}
              people={people as Person[]}
              teamspaces={teamspaces as Teamspace[]}
              onRename={renameGroupAsync}
              onDelete={deleteGroupAsync}
              onAddMember={addMemberAsync}
              onRemoveMember={removeMemberAsync}
              onCreateTeamspace={(id) => {
                const grp = (groups as Group[]).find((x) => x.id === id);
                createFromGroupAsync(grp?.name ?? t("people.newTeamspace"), id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
