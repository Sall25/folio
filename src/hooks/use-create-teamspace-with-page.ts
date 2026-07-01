import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPage as createPageApi } from "../api/pages";
import {
  createTeamspace as createTeamspaceApi,
  deleteTeamspace as deleteTeamspaceApi,
} from "../api/teamspaces";
import { makePage } from "../utils/make-page";
import { queryKeys } from "../lib/queryKeys";
import type { Page, Teamspace, TeamspaceAccess } from "../types";

export interface CreateTeamspaceInput {
  name: string;
  iconName?: string | null;
  iconColor?: string | null;
  description?: string | null;
  access: TeamspaceAccess;
}

// A teamspace is a PAGE (category "Teamspaces") joined to a TEAMSPACE record by
// a SHARED id. The pair is built here and inserted optimistically into BOTH
// caches in onMutate, so the new page exists synchronously — before the modal
// calls onCreated → setActivePageId. (Invalidate-only, as before, left the page
// absent when activation ran, so the active-id fallback landed on the first
// page.) Display fields (title, icon) live on the page; the record holds only
// teamspace-specific fields.
export function useCreateTeamspaceWithPage() {
  const qc = useQueryClient();

  return useMutation({
    // Build page + record here so onMutate and mutationFn share the exact same
    // objects (same id, same cover, same timestamps).
    mutationFn: async (built: { page: Page; record: Teamspace }) => {
      const createdRecord = await createTeamspaceApi(built.record);
      try {
        const createdPage = await createPageApi(built.page);
        return { page: createdPage, teamspace: createdRecord };
      } catch (err) {
        // roll the server back too — best-effort — so a failed page write
        // doesn't leave an orphan record on the server.
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

      const previousPageList = qc.getQueriesData<Page[]>({
        queryKey: queryKeys.pages.lists(),
      });
      const previousTeamspaceList = qc.getQueriesData<Teamspace[]>({
        queryKey: queryKeys.teamspaces.lists(),
      });

      qc.setQueriesData<Page[]>(
        { queryKey: queryKeys.pages.lists() },
        (pages) => (pages ? [...pages, built.page] : pages),
      );
      qc.setQueriesData<Teamspace[]>(
        { queryKey: queryKeys.teamspaces.lists() },
        (teamspaces) => [...(teamspaces ?? []), built.record],
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

// Build the page + record pair from modal input. Kept as a standalone helper
// (not inside the hook) so the id is generated once and both objects share it.
export function buildTeamspacePair(input: CreateTeamspaceInput): {
  page: Page;
  record: Teamspace;
} {
  const id = crypto.randomUUID();
  const name = input.name.trim() || "New teamspace";

  // Record holds ONLY teamspace-specific fields. name/icon are NOT stored here
  // — they live on the page (title, cover.iconName), joined by shared id.
  const record: Teamspace = {
    id,
    description: input.description?.trim() || null,
    access: input.access,
    memberIds: [],
    groupIds: [],
    ownerIds: [],
    createdAt: Date.now(),
  };

  const base = makePage({
    title: name,
    parentId: null,
    category: "Teamspaces",
  });
  const page: Page = {
    ...base,
    id,
    cover: {
      ...base.cover,
      // IconPicker yields Lucide icon names, so target must be "Icons" — that's
      // the discriminator PageItemIcon switches on. Without it, target stays
      // null and the row falls back to a plain FileText, ignoring iconName.
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
