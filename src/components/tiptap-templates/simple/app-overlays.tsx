import { memo, useMemo } from "react";
import { useCurrentPerson } from "src/hooks/use-session";
import { usePeople } from "src/hooks/use-people";
import { useCurrentSpace } from "src/hooks/use-current-space";
import { useChatRealtimeSync } from "src/hooks/use-chat";
import SearchPalette from "./components/search-palette";
import { TemplatesGallery } from "./components/template-gallery";
import { useSearch } from "./context/search-context";
import { useTemplates } from "./context/templates-context";
import { useTemplates as useTemplatesApi } from "src/hooks/use-templates";
import { WorkspaceSettings } from "./components/workspace-settings";
import type { Page, Person } from "src/types";

// Keeps chat unread counts, room order and open rooms live. Rendered here
// because AppOverlays is always mounted (the sidebar isn't, when collapsed).
function ChatRealtimeSync() {
  useChatRealtimeSync();
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

      <WorkspaceSettings />
    </>
  );
}

export const AppOverlays = memo(AppOverlaysImpl);
