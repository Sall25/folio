import { useCallback } from "react";
import type { Page } from "src/types";
import { makePage } from "src/utils/make-page";
import { useCreatePage } from "src/hooks/use-create-page";
import { useCurrentPerson } from "src/hooks/use-session";
import { useCurrentWorkspace } from "src/hooks/use-workspaces";
import { useCurrentSpace } from "src/hooks/use-current-space";

// One rule for "new page here":
//   • in your workspace → a root-level Private page;
//   • inside a teamspace → a child of the teamspace's root page. The server
//     trigger stamps teamspace_id and pins it to the host workspace; the
//     values set here only keep the optimistic cache entry accurate.
export function useCreatePageInSpace() {
  const createPage = useCreatePage();
  const { person } = useCurrentPerson();
  const { workspaceId } = useCurrentWorkspace();
  const space = useCurrentSpace();

  const buildPage = useCallback(
    (title: string): Page | null => {
      if (!person || !workspaceId) return null;
      if (space.kind === "teamspace") {
        return makePage({
          title,
          parentId: space.id,
          category: "Teamspaces",
          ownerId: person.id,
          workspaceId: space.page?.workspaceId ?? workspaceId,
          teamspaceId: space.id,
        });
      }
      return makePage({
        title,
        parentId: null,
        category: "Private",
        ownerId: person.id,
        workspaceId,
      });
    },
    [person, workspaceId, space],
  );

  // Resolves with the created page, or null if the session isn't loaded yet.
  const createPageInSpace = useCallback(
    async (title: string): Promise<Page | null> => {
      const page = buildPage(title);
      if (!page) return null;
      return createPage.mutateAsync(page);
    },
    [buildPage, createPage],
  );

  return { buildPage, createPageInSpace, isPending: createPage.isPending };
}
