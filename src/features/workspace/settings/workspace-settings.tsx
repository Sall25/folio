import { useState } from "react";
import { ArrowLeftRight, Settings, Users } from "src/components/icons";
import { WorkspaceSettingsModal } from "./workspace-settings-modal";
import {
  ACCOUNT_NAV_SECTION,
  DEFAULT_SETTINGS_NAV,
  WORKSPACE_NAV_SECTION,
  type SettingsNavSection,
} from "./workspace-settings-nav";
import { useTranslation } from "react-i18next";
import { useCurrentSpace } from "src/hooks/use-current-space";
import { TeamspaceGeneralContent } from "../teamspaces/teamspace-general/teamspace-general-content";
import { TeamspaceMembersPanel } from "../teamspaces/teamspace-members/teamspace-members-modal";
import { TeamspacesSettingsContent } from "../teamspaces/teamspace-settings-content";
import { PeopleSettingsContent } from "./people-settings-content";
import { useWorkspaceSettings as useWorkspaceSettingsModal } from "../context/workspace-settings-context";
import { LanguageSetting } from "src/components/tiptap-ui/language-settings";
import { useCurrentPerson } from "src/hooks/use-session";
import { WorkspaceSettingsContent } from "./workspace-settings-content";
import { useCollabProvider } from "../../editor/context/collab-provider-context";
import { usePresence } from "../../editor/hooks/use-presence";
import { MyAccountContent } from "./my-account-content";
import { MyConnectionsContent } from "./my-connections-content";
import { MyNotificationsContent } from "./my-notifications-content";
import { MySettingsContent } from "./my-settings-content";

// Nav ids of the teamspace's own panes, and the two links that switch
// between the teamspace's settings and the workspace's.
const TS_GENERAL = "teamspace-general";
const TS_MEMBERS = "teamspace-members";
const OPEN_WORKSPACE = "open-workspace-settings";
const OPEN_TEAMSPACE = "open-teamspace-settings";
const TEAMSPACE_IDS = new Set([TS_GENERAL, TS_MEMBERS]);
const WORKSPACE_IDS = new Set(WORKSPACE_NAV_SECTION.items.map((i) => i.id));

// activeId → content pane. Plug the rest in as they land on this branch.
function SettingsPane({
  activeId,
  teamspaceId,
  onClose,
}: {
  activeId: string;
  teamspaceId: string | null;
  onClose: () => void;
}) {
  if (teamspaceId && activeId === TS_GENERAL) {
    return (
      <TeamspaceGeneralContent teamspaceId={teamspaceId} onDeleted={onClose} />
    );
  }
  if (teamspaceId && activeId === TS_MEMBERS) {
    return <TeamspaceMembersPanel teamspaceId={teamspaceId} onLeft={onClose} />;
  }
  switch (activeId) {
    case "teamspaces":
      return <TeamspacesSettingsContent />;
    case "people":
      return <PeopleSettingsContent />;
    case "language":
      return <LanguageSetting />;
    case "settings":
      return <WorkspaceSettingsContent />;
    case "my-account":
      return <MyAccountContent />;
    case "my-connections":
      return <MyConnectionsContent />;
    case "my-notifications":
      return <MyNotificationsContent />;
    case "my-settings":
      return <MySettingsContent />;
    default:
      return (
        <div
          style={{
            padding: "32px 4px",
            color: "var(--tt-text-color)",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          This section isn’t built yet.
        </div>
      );
  }
}

/**
 * The settings modal. Inside a teamspace it opens on the teamspace's own
 * settings (its Settings and Members, under its name) in place of the
 * workspace's; a link at the bottom of the nav switches to the workspace's
 * settings and back. Panes that only exist for the workspace (People,
 * Teamspaces…) open the workspace's settings directly.
 */
export function WorkspaceSettings() {
  const { t } = useTranslation();
  const { open, onOpenChange, activeId, setActiveId } =
    useWorkspaceSettingsModal();
  const { person } = useCurrentPerson();
  const provider = useCollabProvider();
  const presenceUsers = usePresence(provider);
  const isOnline = presenceUsers.some((u) => u.id === person?.id);

  const space = useCurrentSpace();
  const teamspaceId = space.kind === "teamspace" ? space.id : null;
  const teamspaceName =
    space.kind === "teamspace"
      ? space.page?.title || t("teamspaces.untitled")
      : "";

  // Inside a teamspace: true once the workspace's settings were asked for,
  // until the modal closes.
  const [showWorkspace, setShowWorkspace] = useState(false);

  // A workspace-only pane ("people", "teamspaces"…) always shows the
  // workspace's settings; "settings" means the teamspace's own inside one.
  const workspaceOnly = WORKSPACE_IDS.has(activeId) && activeId !== "settings";
  const teamspaceMode = !!teamspaceId && !showWorkspace && !workspaceOnly;

  const shownId = teamspaceMode
    ? activeId === "settings" || WORKSPACE_IDS.has(activeId)
      ? TS_GENERAL
      : activeId
    : TEAMSPACE_IDS.has(activeId)
      ? "settings"
      : activeId;

  const teamspaceSection: SettingsNavSection = {
    label: teamspaceName,
    items: [
      {
        id: TS_GENERAL,
        labelKey: "settings.items.teamspaceSettings",
        icon: <Settings size={16} />,
      },
      {
        id: TS_MEMBERS,
        labelKey: "settings.items.teamspaceMembers",
        icon: <Users size={16} />,
      },
    ],
  };

  const nav: SettingsNavSection[] = !teamspaceId
    ? DEFAULT_SETTINGS_NAV
    : teamspaceMode
      ? [
          ACCOUNT_NAV_SECTION,
          teamspaceSection,
          {
            labelKey: "settings.nav.workspace",
            items: [
              {
                id: OPEN_WORKSPACE,
                labelKey: "settings.items.workspaceSettings",
                icon: <ArrowLeftRight size={16} />,
              },
            ],
          },
        ]
      : [
          ACCOUNT_NAV_SECTION,
          {
            label: teamspaceName,
            items: [
              {
                id: OPEN_TEAMSPACE,
                labelKey: "settings.items.teamspaceSettingsBack",
                icon: <ArrowLeftRight size={16} />,
              },
            ],
          },
          WORKSPACE_NAV_SECTION,
        ];

  const select = (id: string) => {
    if (id === OPEN_WORKSPACE) {
      setShowWorkspace(true);
      setActiveId("settings");
      return;
    }
    if (id === OPEN_TEAMSPACE) {
      setShowWorkspace(false);
      setActiveId(TS_GENERAL);
      return;
    }
    // A workspace pane picked while showing the workspace's settings keeps
    // them shown (its "Settings" would otherwise mean the teamspace's).
    if (teamspaceId && WORKSPACE_IDS.has(id)) setShowWorkspace(true);
    setActiveId(id);
  };

  const close = () => {
    setShowWorkspace(false);
    onOpenChange(false);
  };

  return (
    <WorkspaceSettingsModal
      open={open}
      onClose={close}
      activeId={shownId}
      onSelect={select}
      nav={nav}
      online={isOnline}
      account={{
        name: person?.name ?? "",
        email: person?.email ?? "",
        avatarUrl: person?.avatarUrl ?? undefined,
      }}
    >
      <SettingsPane
        activeId={shownId}
        teamspaceId={teamspaceMode ? teamspaceId : null}
        onClose={close}
      />
    </WorkspaceSettingsModal>
  );
}
