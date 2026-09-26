import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { ID, Page } from "src/types";
import { newId } from "src/lib/id";
import { makePage } from "src/utils/make-page";
import { useCreatePage } from "src/hooks/use-create-page";
import { useCreateDataSource } from "src/hooks/use-create-data-source";
import { useCurrentPerson } from "src/hooks/use-session";
import { useCurrentWorkspace } from "src/hooks/use-workspaces";
import {
  makeShowcaseSchema,
  showcasePageContent,
  type ShowcaseKeys,
} from "src/utils/make-showcase-source";

export type CreatedShowcaseSource = {
  sourceId: ID;
  pageId: ID;
  keys: ShowcaseKeys;
};

// Where a showcase's database lives, so everyone who can see the room can
// see and add entries:
//   • teamspace room → a page in that teamspace, open to the teamspace;
//   • workspace room → a Shared page, open to the workspace.
// Showcase rooms are open rooms only (see CreateRoomModal), so this matches
// the room's own audience.
export function showcaseAccess(teamspaceId: ID | null) {
  return teamspaceId
    ? {
        parentId: teamspaceId,
        teamspaceId,
        category: "Teamspaces" as const,
        generalAccess: "teamspace" as const,
        generalAccessRole: "edit" as const,
      }
    : {
        parentId: null,
        teamspaceId: null,
        category: "Shared" as const,
        generalAccess: "workspace" as const,
        generalAccessRole: "edit" as const,
      };
}

// Same order as useCreateDatabase, minus the editor insert:
//   1. container page (sourceId null — it owns the database, it is not a row)
//   2. the data source pointing at it
// The room then links to the source via set_room_showcase.
export function useCreateShowcaseSource() {
  const { t } = useTranslation();
  const createPage = useCreatePage();
  const createSource = useCreateDataSource();
  const { person } = useCurrentPerson();
  const { workspaceId } = useCurrentWorkspace();

  return useCallback(
    async (opts: {
      name: string;
      teamspaceId: ID | null;
    }): Promise<CreatedShowcaseSource | null> => {
      if (!person || !workspaceId) return null;

      const sourceId = newId();
      const name =
        opts.name.trim() || t("chat.showcase.defaultName", "Showcase");
      const { keys, properties, views } = makeShowcaseSchema(t);
      const access = showcaseAccess(opts.teamspaceId);

      const dbPage: Page = {
        ...makePage({
          title: name,
          parentId: access.parentId,
          category: access.category,
          ownerId: person.id,
          workspaceId,
        }),
        teamspaceId: access.teamspaceId,
        generalAccess: access.generalAccess,
        generalAccessRole: access.generalAccessRole,
        content: showcasePageContent(sourceId, name, views),
      };
      await createPage.mutateAsync(dbPage);

      await createSource.mutateAsync({
        id: sourceId,
        name,
        pageId: dbPage.id,
        properties,
        savedViews: [],
        views,
        createdAt: Date.now(),
        updatedAt: null,
        rowTemplates: [],
      });

      return { sourceId, pageId: dbPage.id, keys };
    },
    [t, createPage, createSource, person, workspaceId],
  );
}
