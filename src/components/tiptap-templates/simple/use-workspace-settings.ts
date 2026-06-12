import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { InviteLink } from "./types";

const api = "http://localhost:3008";

export interface WorkspaceSettings {
  inviteLink: InviteLink;
}

const DEFAULTS: WorkspaceSettings = {
  inviteLink: { enabled: false, url: "" },
};

// json-server exposes an object-valued top-level key as a singleton at /key,
// supporting GET and PATCH. Add "workspace-settings": { ... } to db.json.
const fetchSettingsAsync = async (): Promise<WorkspaceSettings> => {
  const res = await fetch(`${api}/workspace-settings`);
  if (!res.ok) throw new Error("Failed to fetch workspace settings");
  return res.json();
};

const patchSettingsFnAsync = async (
  patch: Partial<WorkspaceSettings>,
): Promise<WorkspaceSettings> => {
  const res = await fetch(`${api}/workspace-settings`, {
    method: "PATCH",
    body: JSON.stringify(patch),
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to update workspace settings");
  return res.json();
};

function makeInviteUrl(): string {
  const token = crypto.randomUUID().replace(/-/g, "");
  return `https://folio.app/acme/invite/${token}`;
}

const KEY = ["workspaceSettings"] as const;

export function useWorkspaceSettings() {
  const client = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: KEY,
    queryFn: fetchSettingsAsync,
  });

  const settings = data ?? DEFAULTS;

  const { mutateAsync: _patch } = useMutation({
    mutationFn: patchSettingsFnAsync,
    onMutate: async (patch: Partial<WorkspaceSettings>) => {
      await client.cancelQueries({ queryKey: KEY });
      const prev = client.getQueryData<WorkspaceSettings>(KEY);
      client.setQueryData<WorkspaceSettings>(KEY, (old = DEFAULTS) => ({
        ...old,
        ...patch,
      }));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && client.setQueryData(KEY, ctx.prev),
  });

  // Toggle the invite link. Turning it on for the first time mints a url if
  // none exists yet.
  const setInviteEnabledAsync = useCallback(
    (enabled: boolean) => {
      const url =
        enabled && !settings.inviteLink.url
          ? makeInviteUrl()
          : settings.inviteLink.url;
      return _patch({ inviteLink: { enabled, url } });
    },
    [_patch, settings.inviteLink.url],
  );

  const regenerateInviteAsync = useCallback(
    () => _patch({ inviteLink: { enabled: true, url: makeInviteUrl() } }),
    [_patch],
  );

  return {
    settings,
    inviteLink: settings.inviteLink,
    isLoading,
    setInviteEnabledAsync,
    regenerateInviteAsync,
  };
}
