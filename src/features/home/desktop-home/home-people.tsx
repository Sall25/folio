import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Page, Person } from "src/types";
import { Avatar } from "src/components/tiptap-ui-primitive/avatar";
import { usePeople } from "src/hooks/use-people";
import { useCurrentPerson } from "src/hooks/use-session";
import { useTeamspaceMemberList } from "src/hooks/use-teamspace-members";
import { useChatRooms } from "src/hooks/use-chat";
import { useWorkspaceSettings } from "src/features/workspace/context/workspace-settings-context";
import { TeamspaceMembersModal } from "src/features/workspace/teamspaces/teamspace-members/teamspace-members-modal";
import { useWorkspaceOnline } from "src/features/shell/presence/workspace-online";
import { placeOf } from "src/features/desktop/tabs/tab-label";

// The desktop Home's People card: the members (the teamspace's inside one,
// else the workspace's) as a stack with their number, then who's online now
// and where (workspace-presence.tsx), then the others, away. Invite opens
// the workspace's People settings, or the teamspace's members.

const STACK_MAX = 5;
const LIST_MAX = 5;

interface Member {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export function HomePeople({
  teamspaceId,
  pages,
}: {
  teamspaceId: string | null;
  /** Every page this person can see, to name where others are. */
  pages: Page[];
}) {
  const { t } = useTranslation();
  const { person: me } = useCurrentPerson();
  const { members: tsMembers } = useTeamspaceMemberList(teamspaceId);
  const { data: workspacePeople } = usePeople();
  const { all: rooms } = useChatRooms();
  const online = useWorkspaceOnline();
  const { setActiveId, onOpenChange } = useWorkspaceSettings();
  const [membersOpen, setMembersOpen] = useState(false);

  const members = useMemo<Member[]>(
    () =>
      teamspaceId
        ? tsMembers.map(({ person: p }) => ({
            id: p.id,
            name: p.name,
            avatarUrl: p.avatarUrl ?? null,
          }))
        : ((workspacePeople ?? []) as Person[]).map((p) => ({
            id: p.id,
            name: p.name,
            avatarUrl: p.avatarUrl ?? null,
          })),
    [teamspaceId, tsMembers, workspacePeople],
  );

  const onlineById = useMemo(
    () => new Map(online.map((p) => [p.id, p])),
    [online],
  );
  const onlineCount = members.filter((m) => onlineById.has(m.id)).length;

  // Others first: online ones, then away.
  const others = useMemo(
    () =>
      members
        .filter((m) => m.id !== me?.id)
        .sort(
          (a, b) =>
            Number(onlineById.has(b.id)) - Number(onlineById.has(a.id)) ||
            a.name.localeCompare(b.name),
        )
        .slice(0, LIST_MAX),
    [members, me?.id, onlineById],
  );

  /** "in Lesson 5", "in #general"…, only for what this person can see. */
  const whereOf = (path: string): string => {
    const place = placeOf(path);
    if (place.kind === "page") {
      const page = pages.find((p) => p.id === place.id);
      return page
        ? t("desktopHome.inPlace", { place: page.title || t("page.untitled") })
        : t("desktopHome.inAPage");
    }
    if (place.kind === "chat") {
      const room = rooms.find((r) => r.id === place.id);
      return room?.kind === "room" && room.name
        ? t("desktopHome.inPlace", { place: `#${room.name}` })
        : t("desktopHome.inAChat");
    }
    return t("desktopHome.online");
  };

  const invite = () => {
    if (teamspaceId) {
      setMembersOpen(true);
      return;
    }
    setActiveId("people");
    onOpenChange(true);
  };

  const stack = members.slice(0, STACK_MAX);
  const more = members.length - stack.length;

  return (
    <section>
      <h2 className="dhome__h">
        {t("desktopHome.people")}
        <button type="button" className="dhome__link" onClick={invite}>
          {t("desktopHome.invite")}
        </button>
      </h2>
      <div className="dhome__panel">
        <div className="dhome__stack">
          <span className="dhome__faces">
            {stack.map((m) => (
              <Avatar
                key={m.id}
                name={m.name}
                src={m.avatarUrl}
                size="sm"
                className="dhome__face"
              />
            ))}
            {more > 0 && <span className="dhome__face-more">+{more}</span>}
          </span>
          <span className="dhome__stack-text">
            <b>{t("desktopHome.members", { count: members.length })}</b>
            <span>{t("desktopHome.onlineNow", { count: onlineCount })}</span>
          </span>
        </div>
        {others.length > 0 && (
          <ul className="dhome__people">
            {others.map((m) => {
              const here = onlineById.get(m.id);
              return (
                <li key={m.id} className="dhome__person">
                  <Avatar
                    name={m.name}
                    src={m.avatarUrl}
                    size="xs"
                    online={!!here}
                    showTooltip={false}
                  />
                  <span className="dhome__person-name">{m.name}</span>
                  <span className="dhome__person-where">
                    {here ? whereOf(here.path) : t("desktopHome.away")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {membersOpen && teamspaceId && (
        <TeamspaceMembersModal
          teamspaceId={teamspaceId}
          onClose={() => setMembersOpen(false)}
        />
      )}
    </section>
  );
}
