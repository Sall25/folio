import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPage as createPageApi } from "../api/pages";
import {
  createTeamspace as createTeamspaceApi,
  deleteTeamspace as deleteTeamspaceApi,
} from "../api/teamspaces";
import { makePage } from "../utils/make-page";
import { queryKeys } from "../lib/queryKeys";
import type { ID, Page, Teamspace, TeamspaceAccess } from "../types";

export interface CreateTeamspaceInput {
  name: string;
  iconName?: string | null;
  iconColor?: string | null;
  description?: string | null;
  access: TeamspaceAccess;
  // The page under a teamspace needs an owner and a workspace, same as any
  // page — supplied by the caller (current person + current workspace) since
  // this is a pure builder with no hook context.
  ownerId: ID;
  workspaceId: ID;
}

export function useCreateTeamspaceWithPage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (built: { page: Page; record: Teamspace }) => {
      const createdRecord = await createTeamspaceApi(built.record);
      try {
        const createdPage = await createPageApi(built.page);
        return { page: createdPage, teamspace: createdRecord };
      } catch (err) {
        try {
          await deleteTeamspaceApi(built.record.id);
        } catch {
          /* swallow — surfacing the original error matters more */
        }
        throw err;
      }
    },

    onMutate: async (built: { page: Page; record: Teamspace }) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: queryKeys.pages.all }),
        qc.cancelQueries({ queryKey: queryKeys.teamspaces.all }),
      ]);

      // Match on the `.all` prefix — lists() now requires a workspaceId this
      // hook has no single value for, and a prefix matches every workspace's
      // cached list. Guard updaters against non-array (detail) matches.
      const previousPageList = qc.getQueriesData<Page[]>({
        queryKey: queryKeys.pages.all,
      });
      const previousTeamspaceList = qc.getQueriesData<Teamspace[]>({
        queryKey: queryKeys.teamspaces.all,
      });

      qc.setQueriesData<Page[]>({ queryKey: queryKeys.pages.all }, (pages) =>
        Array.isArray(pages) ? [...pages, built.page] : pages,
      );
      qc.setQueriesData<Teamspace[]>(
        { queryKey: queryKeys.teamspaces.all },
        (teamspaces) =>
          Array.isArray(teamspaces)
            ? [...teamspaces, built.record]
            : teamspaces,
      );

      return { previousPageList, previousTeamspaceList };
    },

    onError: (_error, _vars, ctx) => {
      ctx?.previousPageList.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
      ctx?.previousTeamspaceList.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pages.all });
      qc.invalidateQueries({ queryKey: queryKeys.teamspaces.all });
    },
  });
}

export function buildTeamspacePair(input: CreateTeamspaceInput): {
  page: Page;
  record: Teamspace;
} {
  const id = crypto.randomUUID();
  const name = input.name.trim() || "New teamspace";

  const record: Teamspace = {
    id,
    description: input.description?.trim() || null,
    access: input.access,
    memberIds: [],
    groupIds: [],
    ownerIds: [],
    createdAt: Date.now(),
    workspaceId: input.workspaceId,
  };

  const base = makePage({
    ownerId: input.ownerId,
    workspaceId: input.workspaceId,
    title: name,
    parentId: null,
    category: "Teamspaces",
  });
  const page: Page = {
    ...base,
    id,
    cover: {
      ...base.cover,
      ...(input.iconName
        ? {
            iconName: input.iconName,
            target: "Icons" as const,
            ...(input.iconColor ? { color: input.iconColor } : {}),
          }
        : {}),
    },
  };

  return { page, record };
}
