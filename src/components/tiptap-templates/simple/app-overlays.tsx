import { useCurrentPerson } from "src/hooks/use-session";
import SearchPalette from "./components/search-palette";
import { TemplatesGallery } from "./components/template-gallery";
import { useSearch } from "./context/search-context";
import { useTemplates } from "./context/templates-context";
import { useTemplates as useTemplatesApi } from "src/hooks/use-templates";
import { WorkspaceSettings } from "./components/workspace-settings";
import { memo } from "react";

function AppOverlaysImpl() {
  const { open } = useSearch();
  const {
    open: templatesGalleryOpen,
    onOpenChange: onTemplatesGalleryOpenChange,
  } = useTemplates();

  const { data: templates } = useTemplatesApi();
  const { person: currentPerson } = useCurrentPerson();

  return (
    <>
      {open && <SearchPalette />}
      {templatesGalleryOpen && (
        <TemplatesGallery
          templates={templates ?? []}
          open={templatesGalleryOpen}
          onClose={() => onTemplatesGalleryOpenChange?.(false)}
          getTemplateMeta={() => ({
            createdBy: {
              name: currentPerson?.name ?? "",
              avatarUrl: currentPerson?.avatarUrl ?? null,
            },
            // usedBy/usedCount aren't backed by real usage data yet — that needs
            // its own tracking (who's opened/used a template), separate from
            // "who am I." Left as placeholders until that exists.
            usedBy: [{ name: "Jule" }, { name: "Amadou" }],
            usedCount: 12,
          })}
        />
      )}

      {/* Renders null until opened via the WorkspaceSettings context. */}
      <WorkspaceSettings />
    </>
  );
}

export const AppOverlays = memo(AppOverlaysImpl);
