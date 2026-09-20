import { WorkspaceSettingsModal } from "./workspace-settings-modal";
import { TeamspacesSettingsContent } from "../teamspace-settings-content";
import { PeopleSettingsContent } from "../people-settings-content";
import { useWorkspaceSettings as useWorkspaceSettingsModal } from "../../context/workspace-settings-context";
import { LanguageSetting } from "src/components/tiptap-ui/language-settings";
import { useCurrentPerson } from "src/hooks/use-session";
import { WorkspaceSettingsContent } from "./workspace-settings-content";
import { useCollabProvider } from "../../context/collab-provider-context";
import { usePresence } from "../../hooks/use-presence";

// activeId → content pane. Plug the rest in as they land on this branch.
function SettingsPane({ activeId }: { activeId: string }) {
  switch (activeId) {
    case "teamspaces":
      return <TeamspacesSettingsContent />;
    case "people":
      return <PeopleSettingsContent />;
    case "language":
      return <LanguageSetting />;
    case "settings":
      return <WorkspaceSettingsContent />;
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

export function WorkspaceSettings() {
  const { open, onOpenChange, activeId, setActiveId } =
    useWorkspaceSettingsModal();
  const { person } = useCurrentPerson();
  const provider = useCollabProvider();
  const presenceUsers = usePresence(provider);
  const isOnline = presenceUsers.some((u) => u.id === person?.id);

  return (
    <WorkspaceSettingsModal
      open={open}
      onClose={() => onOpenChange(false)}
      activeId={activeId}
      onSelect={setActiveId}
      online={isOnline}
      account={{
        name: person?.name ?? "",
        email: person?.email ?? "",
        avatarUrl: person?.avatarUrl ?? undefined,
      }}
    >
      <SettingsPane activeId={activeId} />
    </WorkspaceSettingsModal>
  );
}
