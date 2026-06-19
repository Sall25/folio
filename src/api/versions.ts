import type { ID, Version } from "src/types";
import { http } from "./client";

export const fetchVersions = () => http<Version[]>("/versions");

export const fetchVersion = (id: ID) => http<Version>(`/versions/${id}`);

export const fetchVersionsByPage = (pageId: ID) =>
  http<Version[]>(`/versions?pageId=${encodeURIComponent(pageId)}`);

export const deleteVersion = (id: ID) =>
  http<void>(`/versions/${id}`, { method: "DELETE" });

export const patchVersion = (id: ID, patch: Partial<Version>) =>
  http<Version>(`/versions/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ ...patch }),
  });

export const createVersion = (version: Version) =>
  http<Version>("/versions", {
    method: "POST",
    body: JSON.stringify(version),
  });
