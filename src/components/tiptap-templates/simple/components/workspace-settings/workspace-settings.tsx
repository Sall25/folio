// Mount once near the editor root (alongside TemplatesGallery). Consumes the
// WorkspaceSettings context and renders the modal + the active content pane.
//
import { WorkspaceSettingsModal } from "./workspace-settings-modal";
import { TeamspacesSettingsContent } from "../teamspace-settings-content";
import { useWorkspaceSettings } from "../../context/workspace-settings-context";

// activeId → content pane. Only teamspaces is wired here; plug the others in as
// they land on this branch (PeopleSettingsContent, LanguageSetting, etc.).
function SettingsPane({ activeId }: { activeId: string }) {
  switch (activeId) {
    case "teamspaces":
      return <TeamspacesSettingsContent />;
    // case "people":
    //   return <PeopleSettingsContent />;
    // case "language":
    //   return <LanguageSetting />; // lives on feat/languages — wire after merge
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
  const { open, onOpenChange, activeId, setActiveId } = useWorkspaceSettings();

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
