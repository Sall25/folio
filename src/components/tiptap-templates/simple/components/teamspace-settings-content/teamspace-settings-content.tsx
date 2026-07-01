import { useMemo, useState } from "react";
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
import { useGroups } from "src/hooks/use-groups";
import { useManageTeamspaces } from "src/hooks/use-teamspaces";
import { usePagesByCategory } from "src/hooks/use-pages";
import { PageItemIcon } from "../../page-item-icon";
import {
  attachedGroups,
  directMembers,
  effectiveMemberCount,
  type Page,
  type Teamspace,
  type TeamspaceAccess,
} from "src/types";
import { memberCount, type Group, type Person } from "src/types";
import "./teamspace-settings-content.scss";

const ACCESS_LABEL: Record<TeamspaceAccess, string> = {
  open: "Open",
  closed: "Closed",
  private: "Private",
};

// name/icon live on the PAGE now (joined to the record by shared id). These
// helpers read display fields off the page, with safe fallbacks if the page
// isn't loaded yet (or is briefly missing during an optimistic create).
const nameOf = (page: Page | undefined) => page?.title || "Untitled";

function Avatar({ person, size = 22 }: { person: Person; size?: number }) {
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
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="ts-access">
          {ACCESS_LABEL[value]}
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start">
        <Card style={{ padding: 4, minWidth: 160 }}>
          {(Object.keys(ACCESS_LABEL) as TeamspaceAccess[]).map((a) => (
            <Button
              key={a}
              variant="ghost"
              style={{ justifyContent: "flex-start", width: "100%" }}
              onClick={() => {
                onChange(a);
                setOpen(false);
              }}
            >
              <span className="tiptap-button-text">{ACCESS_LABEL[a]}</span>
            </Button>
          ))}
        </Card>
      </PopoverContent>
    </Popover>
  );
}

// Add direct PEOPLE to a teamspace.
function MemberPicker({
  ts,
  people,
  onAdd,
  onRemove,
}: {
  ts: Teamspace;
  people: Person[];
  onAdd: (id: string, personId: string) => void;
  onRemove: (id: string, personId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const candidates = !q
    ? people
    : people.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q),
      );
  const toggle = (pid: string) =>
    ts.memberIds.includes(pid) ? onRemove(ts.id, pid) : onAdd(ts.id, pid);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="ts-add">
          <UserPlus size={14} />
          <span>Add members</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start">
        <Card style={{ padding: "5px 10px", minWidth: 260 }}>
          <div className="ts-picker-search">
            <Search size={13} style={{ opacity: 0.6 }} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people…"
            />
          </div>
          <div className="ts-picker-list">
            {candidates.length === 0 ? (
              <span className="ts-picker-empty">No people</span>
            ) : (
              candidates.map((p) => {
                const selected = ts.memberIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    className="ts-picker-row"
                    onClick={() => toggle(p.id)}
                  >
                    <Avatar person={p} size={22} />
                    <span className="ts-picker-row__text">
                      <span className="ts-picker-row__name">{p.name}</span>
                      <span className="ts-picker-row__sub">{p.email}</span>
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
          <span>Attach group</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start">
        <Card style={{ padding: "5px 10px", minWidth: 260 }}>
          <div className="ts-picker-search">
            <Search size={13} style={{ opacity: 0.6 }} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search groups…"
            />
          </div>
          <div className="ts-picker-list">
            {candidates.length === 0 ? (
              <span className="ts-picker-empty">No groups</span>
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
                        {memberCount(g)} member{memberCount(g) === 1 ? "" : "s"}
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

function TeamspaceRow({
  ts,
  page,
  people,
  groups,
  onRename,
  onSetAccess,
  onDelete,
  onAddMember,
  onRemoveMember,
  onAttachGroup,
  onDetachGroup,
}: {
  ts: Teamspace;
  page: Page | undefined;
  people: Person[];
  groups: Group[];
  onRename: (id: string, name: string) => void;
  onSetAccess: (id: string, a: TeamspaceAccess) => void;
  onDelete: (id: string) => void;
  onAddMember: (id: string, personId: string) => void;
  onRemoveMember: (id: string, personId: string) => void;
  onAttachGroup: (id: string, groupId: string) => void;
  onDetachGroup: (id: string, groupId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const name = nameOf(page);
  const [draft, setDraft] = useState(name);

  const members = directMembers(ts, people);
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
          aria-label={expanded ? "Collapse" : "Expand"}
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
          {effectiveMemberCount(ts, groups)} member
          {effectiveMemberCount(ts, groups) === 1 ? "" : "s"}
        </span>

        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="ts-row__menu" aria-label="More">
              <MoreHorizontal size={16} />
            </button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="end">
            <Card style={{ padding: 4, minWidth: 180 }}>
              <Button
                variant="ghost"
                style={{ justifyContent: "flex-start", width: "100%" }}
                onClick={() => {
                  setMenuOpen(false);
                  setDraft(name);
                  setRenaming(true);
                }}
              >
                <span className="tiptap-button-text">Rename</span>
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
                  onDelete(ts.id);
                }}
              >
                <Trash2 className="tiptap-button-icon" size={14} />
                <span className="tiptap-button-text">Delete</span>
              </Button>
            </Card>
          </PopoverContent>
        </Popover>
      </div>

      {expanded && (
        <div className="ts-detail">
          {/* Direct members */}
          <div className="ts-detail__section">
            <div className="ts-detail__label">Members</div>
            {members.length === 0 ? (
              <span className="ts-detail__empty">No direct members</span>
            ) : (
              members.map((m) => (
                <div className="ts-detail__row" key={m.id}>
                  <Avatar person={m} size={20} />
                  <span className="ts-detail__name">{m.name}</span>
                  <span className="ts-detail__sub">{m.email}</span>
                  <button
                    type="button"
                    className="ts-detail__remove"
                    aria-label={`Remove ${m.name}`}
                    onClick={() => onRemoveMember(ts.id, m.id)}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))
            )}
            <MemberPicker
              ts={ts}
              people={people}
              onAdd={onAddMember}
              onRemove={onRemoveMember}
            />
          </div>

          {/* Attached groups */}
          <div className="ts-detail__section">
            <div className="ts-detail__label">Groups</div>
            {attached.length === 0 ? (
              <span className="ts-detail__empty">No attached groups</span>
            ) : (
              attached.map((g) => (
                <div className="ts-detail__row" key={g.id}>
                  <span className="ts-detail__group-icon">
                    {g.icon ? g.icon : <Users size={14} />}
                  </span>
                  <span className="ts-detail__name">{g.name}</span>
                  <span className="ts-detail__sub">
                    {memberCount(g)} member{memberCount(g) === 1 ? "" : "s"}
                  </span>
                  <button
                    type="button"
                    className="ts-detail__remove"
                    aria-label={`Detach ${g.name}`}
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
    </>
  );
}

export function TeamspacesSettingsContent() {
  const { data: people = [] } = usePeople();
  const { data: groups = [] } = useGroups();
  // Teamspace PAGES (roots with category "Teamspaces") — joined to records by
  // shared id to resolve each teamspace's display name + icon.
  const { data: teamspacePages = [] } = usePagesByCategory("Teamspaces");
  const {
    teamspaces,
    addTeamspaceAsync,
    renameTeamspaceAsync,
    setAccessAsync,
    deleteTeamspaceAsync,
    addMemberAsync,
    removeMemberAsync,
    attachGroupAsync,
    detachGroupAsync,
  } = useManageTeamspaces();

  const pagesById = useMemo(() => {
    const m = new Map<string, Page>();
    for (const p of teamspacePages as Page[]) m.set(p.id, p);
    return m;
  }, [teamspacePages]);

  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = (
    !q
      ? teamspaces
      : (teamspaces as Teamspace[]).filter((t) =>
          nameOf(pagesById.get(t.id)).toLowerCase().includes(q),
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
            placeholder="Search teamspaces..."
          />
        </div>
        <Button
          onClick={() => addTeamspaceAsync({ name: "New teamspace" })}
          style={{ flexShrink: 0 }}
        >
          <Plus className="tiptap-button-icon" size={14} />
          <span className="tiptap-button-text">Create teamspace</span>
        </Button>
      </div>

      <div className="ts-table">
        <div className="ts-table__head">
          <span className="ts-col ts-col--expand" />
          <span className="ts-col">Teamspace</span>
          <span className="ts-col">Access</span>
          <span className="ts-col">Members</span>
          <span className="ts-col ts-col--menu" />
        </div>
        {filtered.length === 0 ? (
          <div className="ts-empty">No teamspaces yet</div>
        ) : (
          filtered.map((t) => (
            <TeamspaceRow
              key={t.id}
              ts={t}
              page={pagesById.get(t.id)}
              people={people as Person[]}
              groups={groups as Group[]}
              onRename={renameTeamspaceAsync}
              onSetAccess={setAccessAsync}
              onDelete={deleteTeamspaceAsync}
              onAddMember={addMemberAsync}
              onRemoveMember={removeMemberAsync}
              onAttachGroup={attachGroupAsync}
              onDetachGroup={detachGroupAsync}
            />
          ))
        )}
      </div>
    </div>
  );
}
