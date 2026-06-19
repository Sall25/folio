import type { ID, Page } from "src/types";
import { http } from "./client";

export const fetchPages = () => http<Page[]>("/pages");

export const fetchPage = (id: ID) => http<Page>(`/pages/${id}`);

export const patchPage = (id: ID, patch: Partial<Page>) =>
  http<Page>(`/pages/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

export const deletePage = (id: ID) =>
  http<void>(`/pages/${id}`, { method: "DELETE" });

export const createPage = (page: Page) =>
  http<Page>("/pages", { method: "POST", body: JSON.stringify(page) });
