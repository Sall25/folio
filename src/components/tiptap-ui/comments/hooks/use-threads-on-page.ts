import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Comment, Thread } from "../types";
import { useMemo } from "react";

export interface UseThreadsOnPageReturn {
  threads: Thread[] | undefined;
  isLoading: boolean;
  saveThreadsAsync: (threads: Thread[]) => Promise<Response[]>;
  deleteThreadAsync: (thread: Thread) => Promise<void>;
  createThreadAsync: (thread: Thread) => Promise<Thread>;
  resolveThreadAsync: (thread: Thread) => Promise<Thread>;
  unresolveThreadAsync: (thread: Thread) => Promise<Thread>;
  addCommentsAsync: (data: {
    thread: Thread;
    newComments: Comment[];
  }) => Promise<Thread>;
  removeCommentsAsync: (thread: Thread) => Promise<Thread>;
  updateCommentAsync: (data: {
    thread: Thread;
    commentId: string;
    newText: string;
  }) => Promise<Thread>;
}

export function useThreadsOnPage(
  pageId: number | undefined,
): UseThreadsOnPageReturn {
  const client = useQueryClient();

  const { data: threads, isLoading } = useQuery({
    queryKey: ["threads", pageId],
    queryFn: async () => {
      if (pageId === undefined) return []; //return empty array instead of undefined
      const res = await fetch(`http://localhost:3002/threads?pageId=${pageId}`);

      if (!res.ok) throw new Error(`couldn't find threads on pageId ${pageId}`);
      const data = await res.json();
      return (data.threads ?? data) as Thread[];
    },
    enabled: !!pageId,
    staleTime: 1000 * 60 * 5, // 5 mins
    // enabled: !!activePage?.id,
  });

  const { mutateAsync: createThreadAsync } = useMutation({
    mutationFn: async (thread: Thread) => {
      const res = await fetch("http://localhost:3002/threads", {
        method: "POST",
        body: JSON.stringify(thread),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok)
        throw new Error(`Failed to create a new thread ${res.status}`);

      return res.json();
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["threads"] });
    },
  });

  const { mutateAsync: deleteThreadAsync } = useMutation({
    mutationFn: async (thread: Thread) => {
      const res = await fetch(`http://localhost:3002/threads/${thread.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error(`Failed to delete thread ${res.status}`);
    },
    onSuccess: (_data, thread) => {
      client.setQueryData<Thread[]>(["threads", pageId], (old = []) =>
        old.filter((t) => t.id !== thread.id),
      );
    },
  });

  const { mutateAsync: resolveThreadAsync } = useMutation({
    mutationFn: async (thread: Thread) => {
      const res = await fetch(`http://localhost:3002/threads/${thread.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...thread, status: "resolved" }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`Couldn't resolve thread ${res.status}`);

      return res.json();
    },
    onSuccess: (updatedThread) => {
      client.setQueryData<Thread[]>(["threads", pageId], (old = []) =>
        old.map((t) => (t.id === updatedThread.id ? updatedThread : t)),
      );
    },
  });

  const { mutateAsync: addCommentsAsync } = useMutation({
    mutationFn: async ({
      thread,
      newComments,
    }: {
      thread: Thread;
      newComments: Comment[];
    }) => {
      const res = await fetch(`http://localhost:3002/threads/${thread.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...thread, comments: newComments }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok)
        throw new Error(`Couldn't add comments to thread ${res.status}`);

      return res.json();
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["threads"] });
    },
  });
  const { mutateAsync: removeCommentsAsync } = useMutation({
    mutationFn: async (thread: Thread) => {
      const res = await fetch(`http://localhost:3002/threads/${thread.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...thread, comments: [] }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok)
        throw new Error(`Failed to remove comments from thread ${res.status}`);

      return res.json();
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["threads"] });
    },
  });

  const { mutateAsync: saveThreadsAsync } = useMutation({
    mutationFn: async (threads: Thread[]) =>
      await Promise.all(
        threads.map(async (thread) => {
          const res = await fetch(
            `http://localhost:3002/threads/${thread.id}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(thread),
            },
          );

          if (res.status === 404) {
            return fetch(`http://localhost:3002/threads`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(thread),
            });
          }

          return res;
        }),
      ),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["threads"] });
    },
  });

  const { mutateAsync: updateCommentAsync } = useMutation({
    mutationFn: async ({
      thread,
      commentId,
      newText,
    }: {
      thread: Thread;
      commentId: string;
      newText: string;
    }) => {
      const updatedComments = thread.comments.map((c) =>
        c.id === commentId ? { ...c, text: newText } : c,
      );
      const res = await fetch(`http://localhost:3002/threads/${thread.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...thread, comments: updatedComments }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`Couldn't update comment ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["threads"] });
    },
  });

  const { mutateAsync: unresolveThreadAsync } = useMutation({
    mutationFn: async (thread: Thread) => {
      const res = await fetch(`http://localhost:3002/threads/${thread.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...thread, status: "open" }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`Couldn't unresolve thread ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["threads"] });
    },
  });

  return useMemo(
    () => ({
      threads,
      isLoading,
      saveThreadsAsync,
      deleteThreadAsync,
      createThreadAsync,
      resolveThreadAsync,
      unresolveThreadAsync,
      addCommentsAsync,
      removeCommentsAsync,
      updateCommentAsync,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [threads, isLoading], // mutation fns are stable within a session
  );
}
