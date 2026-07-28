import type { ID, Thread } from "src/types";
import { http } from "./client";

export const fetchThreads = () => http<Thread[]>("/threads");

export const fetchThread = (id: ID) => http<Thread>(`/threads/${id}`);

export const fetchThreadsByPage = (pageId: ID) =>
  http<Thread[]>(`/threads?pageId=${encodeURIComponent(pageId)}`);

export const deleteThread = (id: ID) =>
  http<void>(`/threads/${id}`, { method: "DELETE" });

export const patchThread = (id: ID, patch: Partial<Thread>) =>
  http<Thread>(`/threads/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ ...patch }),
  });

export const createThread = (thread: Thread) => {
  console.log("POST thread", thread);
  return http<Thread>("/threads", {
    method: "POST",
    body: JSON.stringify(thread),
  });
};
