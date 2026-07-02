import { WorkspaceSettingsModal } from "./workspace-settings-modal";
import { TeamspacesSettingsContent } from "../teamspace-settings-content";
import { PeopleSettingsContent } from "../people-settings-content";
import { useWorkspaceSettings as useWorkspaceSettingsModal } from "../../context/workspace-settings-context";
import { LanguageSetting } from "src/components/tiptap-ui/language-settings";

// activeId → content pane. Plug the rest in as they land on this branch.
function SettingsPane({ activeId }: { activeId: string }) {
  switch (activeId) {
    case "teamspaces":
      return <TeamspacesSettingsContent />;
    case "people":
      return <PeopleSettingsContent />;
    case "language":
      return <LanguageSetting />;
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

  return (
    <WorkspaceSettingsModal
      open={open}
      onClose={() => onOpenChange(false)}
      activeId={activeId}
      onSelect={setActiveId}
      // TODO: wire to the real current user once a session concept exists.
      account={{ name: "Souleymane Sall", email: "" }}
    >
      <SettingsPane activeId={activeId} />
    </WorkspaceSettingsModal>
  );
}
