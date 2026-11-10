import { memo, useMemo } from "react";
import { useCurrentPerson } from "src/hooks/use-session";
import { usePeople } from "src/hooks/use-people";
import { useCurrentSpace } from "src/hooks/use-current-space";
import { useChatRealtimeSync } from "src/hooks/use-chat";
import { useDatabaseDateReminders } from "../database/hooks/use-database-date-reminders";
import SearchPalette from "./search/search-palette";
import { TemplatesGallery } from "../pages/templates/template-gallery";
import { DiscussBlockHost } from "../chat/discuss-block-dialog";
import { useSearch } from "./search/search-context";
import { useTemplates } from "../pages/templates/templates-context";
import { useTemplates as useTemplatesApi } from "src/hooks/use-templates";
import { WorkspaceSettings } from "../workspace/settings";
import { SpaceAccentRoot } from "./space-accent/space-accent-root";
import { SignOutHost } from "../auth/sign-out";
import { TeamspaceMoveDialog } from "../pages/teamspace-move";
import { takePendingInvite } from "../workspace/join/pending-invite";
import { takePendingForm } from "src/api/forms";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-location";
import type { Page, Person } from "src/types";

// An invite link opened while signed out → open it now that you're in.
function PendingInviteRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    const token = takePendingInvite();
    if (token) {
      navigate({ to: `/invite/${token}` });
      return;
    }
    // A form opened while signed out: back to it.
    const form = takePendingForm();
    if (form) window.location.assign(form);
  }, [navigate]);
  return null;
}

function ChatRealtimeSync() {
  useChatRealtimeSync();
  return null;
}

// Date property reminders → the inbox (see useDatabaseDateReminders).
function DatabaseDateReminders() {
  useDatabaseDateReminders();
  return null;
}

function AppOverlaysImpl() {
  const { open } = useSearch();
  const {
    open: templatesGalleryOpen,
    onOpenChange: onTemplatesGalleryOpenChange,
  } = useTemplates();

  const { data: templates } = useTemplatesApi();
  const { person: currentPerson } = useCurrentPerson();
  const { data: people = [] } = usePeople();
  const space = useCurrentSpace();
  const teamspaceId = space.kind === "teamspace" ? space.id : null;

  const scopedTemplates = useMemo(
    () =>
      ((templates ?? []) as Page[]).filter((tpl) =>
        teamspaceId ? tpl.teamspaceId === teamspaceId : tpl.teamspaceId == null,
      ),
    [templates, teamspaceId],
  );

  const peopleById = useMemo(
    () => new Map((people as Person[]).map((p) => [p.id, p])),
    [people],
  );

  return (
    <>
      <ChatRealtimeSync />
      <DatabaseDateReminders />
      <DiscussBlockHost />
      {open && <SearchPalette />}
      {templatesGalleryOpen && (
        <TemplatesGallery
          templates={scopedTemplates}
          open={templatesGalleryOpen}
          onClose={() => onTemplatesGalleryOpenChange?.(false)}
          getTemplateMeta={(template) => {
            const owner =
              template.ownerId === currentPerson?.id
                ? currentPerson
                : template.ownerId
                  ? peopleById.get(template.ownerId)
                  : undefined;
            return {
              createdBy: owner
                ? {
                    id: owner.id,
                    name: owner.name,
                    avatarUrl: owner.avatarUrl ?? null,
                  }
                : undefined,
              usedBy: [{ name: "Jule" }, { name: "Amadou" }],
              usedCount: 12,
            };
          }}
        />
      )}

      <SpaceAccentRoot />
      <WorkspaceSettings />
      <SignOutHost />
      <TeamspaceMoveDialog />
      <PendingInviteRedirect />
    </>
  );
}

export const AppOverlays = memo(AppOverlaysImpl);
