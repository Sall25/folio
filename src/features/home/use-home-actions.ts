import { useTranslation } from "react-i18next";
import type { Page } from "src/types";
import { useCreatePage } from "src/hooks/use-create-page";
import { useActivePageActions } from "../pages/context/active-page-context";
import { makePage } from "src/utils/make-page";
import { useTemplates } from "src/hooks/use-templates";
import { useClonePage } from "src/features/database/hooks/use-clone-page";
import { useCurrentPerson } from "src/hooks/use-session";
import { useCurrentWorkspace } from "src/hooks/use-workspaces";
import { useCurrentSpace } from "src/hooks/use-current-space";

// What home lets you start: a new page or a copy of a template, both in the
// current space (inside a teamspace, or your private pages). Used by the app
// toolbar on the home view.
export function useHomeActions() {
  const { t } = useTranslation();
  const { setActivePageId } = useActivePageActions();
  const createPage = useCreatePage();
  const { person } = useCurrentPerson();
  const { workspaceId } = useCurrentWorkspace();
  const space = useCurrentSpace();
  const { data: templates = [] } = useTemplates();
  const { clone, cloning } = useClonePage();

  const newPage = (title?: string) => {
    if (!person || !workspaceId) return;
    const name = title?.trim() || t("page.newPage");
    // Inside a teamspace, the new page goes INTO it (child of the root); the
    // server trigger stamps teamspace_id and pins it to the host workspace.
    const page =
      space.kind === "teamspace"
        ? makePage({
            title: name,
            parentId: space.id,
            category: "Teamspaces",
            ownerId: person.id,
            workspaceId: space.page?.workspaceId ?? workspaceId,
            teamspaceId: space.id,
          })
        : makePage({
            title: name,
            parentId: null,
            category: "Private",
            ownerId: person.id,
            workspaceId,
          });
    createPage.mutate(page);
    setActivePageId(page.id);
  };

  // A template is copied into the current space and opened.
  const applyTemplate = (template: Page) => {
    if (cloning) return;
    void clone(
      template,
      space.kind === "teamspace"
        ? {
            parentId: space.id,
            teamspaceId: space.id,
            category: "Teamspaces",
            generalAccess: "teamspace",
            generalAccessRole: "edit",
          }
        : {},
    );
  };

  return { newPage, applyTemplate, templates, cloning };
}
