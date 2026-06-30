import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InviteLink } from "../types";
import {
  fetchWorkspaceSettings,
  patchWorkspaceSettings,
  type WorkspaceSettings,
} from "../api/workspace-settings";

const WS_KEY = ["workspaceSettings", "default"] as const;

// Fallback so inviteLink.enabled / .url are always readable, even pre-load.
const DEFAULT_INVITE: InviteLink = { enabled: false, url: "" };

// Swap for your own id/token helper if you have one.
function genInviteUrl(): string {
  return `https://folio.app/invite/${crypto.randomUUID().slice(0, 8)}`;
}

export function useWorkspaceSettings() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: WS_KEY,
    queryFn: fetchWorkspaceSettings,
  });

  const inviteLink = query.data?.inviteLink ?? DEFAULT_INVITE;

  const patch = useMutation({
    mutationFn: (next: InviteLink) =>
      patchWorkspaceSettings({ inviteLink: next }),
    onMutate: async (next: InviteLink) => {
      await qc.cancelQueries({ queryKey: WS_KEY });
      const previous = qc.getQueryData<WorkspaceSettings>(WS_KEY);
      qc.setQueryData<WorkspaceSettings>(WS_KEY, (old) =>
        old ? { ...old, inviteLink: next } : old,
      );
      return { previous };
    },
    onError: (_error, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(WS_KEY, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: WS_KEY });
    },
  });

  return {
    inviteLink,
    isPending: query.isPending,
    isError: query.isError,

    setInviteEnabledAsync: (enabled: boolean) =>
      patch.mutateAsync({ ...inviteLink, enabled }),

    regenerateInviteAsync: () =>
      patch.mutateAsync({ ...inviteLink, url: genInviteUrl() }),
  };
}
