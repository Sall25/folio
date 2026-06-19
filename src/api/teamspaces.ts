import type { ID, Teamspace } from "src/types";
import { http } from "./client";

export const fetchTeamspaces = () => http<Teamspace[]>("/teamspaces");

export const fetchTeamspace = (id: ID) => http<Teamspace>(`/teamspaces/${id}`);

export const deleteTeamspace = (id: ID) =>
  http<void>(`/teamspaces/${id}`, { method: "DELETE" });

export const patchTeamspace = (id: ID, patch: Partial<Teamspace>) =>
  http<Teamspace>(`/teamspaces/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ ...patch }),
  });

export const createTeamspace = (teamspace: Teamspace) =>
  http<Teamspace>("/teamspaces", {
    method: "POST",
    body: JSON.stringify(teamspace),
  });
