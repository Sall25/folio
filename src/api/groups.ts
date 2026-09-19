import type { Group, ID } from "src/types/types";
import { http } from "./client";

export const fetchGroups = (workspaceId: ID) =>
  http<Group[]>(`/groups?workspace_id=eq.${workspaceId}`);

export const fetchGroup = (id: ID) => http<Group>(`/groups/${id}`);

export const deleteGroup = (id: ID) =>
  http<void>(`/groups/${id}`, {
    method: "DELETE",
  });

export const patchGroup = (id: ID, patch: Partial<Group>) =>
  http<Group>(`/groups/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ ...patch }),
  });

export const createGroup = (group: Group) =>
  http<Group>("/groups", {
    method: "POST",
    body: JSON.stringify(group),
  });
