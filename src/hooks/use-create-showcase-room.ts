import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ID, Page } from "src/types";
import { newId } from "src/lib/id";
import { makeDatabasePage } from "src/utils/make-page";
import { makeDataSource } from "src/utils/make-data-source";
import { useCreatePage } from "src/hooks/use-create-page";
import { useCreateDataSource } from "src/hooks/use-create-data-source";
import { useCreateChatRoom } from "src/hooks/use-chat";
import { useTemplates } from "src/hooks/use-templates";
import { useCurrentPerson } from "src/hooks/use-session";
import { useCurrentWorkspace } from "src/hooks/use-workspaces";
import { useCurrentSpace } from "src/hooks/use-current-space";
import { setRoomShowcase } from "src/api/chat-rows";
import { useClonePage } from "src/components/tiptap-node/inline-database/hooks/use-clone-page";
import { showcaseKeys } from "./use-chat-rows";

// A database template = a Template page whose content holds a database node.
// Any community can publish one; the clone is fully theirs to reshape.
function isDatabaseTemplate(p: Page): boolean {
  return !!p.content?.content?.some(
    (n) => n.type === "database" && !!n.attrs?.sourceId,
  );
}

export function useDatabaseTemplates() {
  const { data: templates = [], isLoading } = useTemplates();
  const databaseTemplates = useMemo(
    () => templates.filter(isDatabaseTemplate),
    [templates],
  );
  return { templates: databaseTemplates, isLoading };
}

// The showcase database lives in the room's space, open to the same people
// (showcase rooms are open rooms). Edit, so members can add entries.
export function showcasePlacement(teamspaceId: ID | null) {
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

// Create room → create its database (clone a template, or blank) → link.
// If a later step fails, the room is left as an ordinary chat room.
export function useCreateShowcaseRoom() {
  const qc = useQueryClient();
  const space = useCurrentSpace();
  const { person } = useCurrentPerson();
  const { workspaceId } = useCurrentWorkspace();
  const createRoom = useCreateChatRoom();
  const createPage = useCreatePage();
  const createSource = useCreateDataSource();
  const { clone } = useClonePage();

  return useMutation({
    mutationFn: async (args: {
      name: string;
      memberIds: string[];
      /** null → blank database */
      template: Page | null;
    }) => {
      if (!person || !workspaceId) throw new Error("Not ready");
      const teamspaceId = space.kind === "teamspace" ? space.id : null;
      const placement = showcasePlacement(teamspaceId);

      const roomId = await createRoom.mutateAsync({
        name: args.name,
        visibility: "open",
        memberIds: args.memberIds,
      });

      let pageId: ID;
      if (args.template) {
        const cloned = await clone(args.template, {
          ...placement,
          navigate: false,
        });
        if (!cloned) throw new Error("Not ready");
        pageId = cloned.id;
      } else {
        const sourceId = newId();
        const dbPage: Page = {
          ...makeDatabasePage({
            ownerId: person.id,
            workspaceId,
            teamspaceId,
            sourceId,
            name: args.name,
            parentId: placement.parentId,
            category: placement.category,
          }),
          generalAccess: placement.generalAccess,
          generalAccessRole: placement.generalAccessRole,
        };
        // Page first: the source's guard checks the container page exists.
        await createPage.mutateAsync(dbPage);
        await createSource.mutateAsync(
          makeDataSource({ name: args.name, pageId: dbPage.id, sourceId }),
        );
        pageId = dbPage.id;
      }

      await setRoomShowcase(roomId, pageId);
      qc.setQueryData(showcaseKeys.page(roomId), pageId);
      return roomId;
    },
  });
}
