import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "src/api/supabase-client";
import {
  CHAT_MAX_FILE_BYTES,
  CHAT_MAX_FILES,
  fetchRoomAttachments,
  removeChatFile,
  sendMessageWithAttachments,
  signChatFiles,
  toAttachment,
  uploadChatFile,
  type AttachmentRow,
  type ChatAttachment,
  type UploadedFile,
} from "src/api/chat-attachments";
import type { ChatMessage } from "src/types";
import { chatKeys } from "./use-chat";
import { useCurrentPerson } from "./use-session";
import { enqueueChatMessage } from "src/lib/chat-outbox";
import { isNetworkError, isOfflineNow } from "src/lib/sync-status";

const attachmentsKey = (roomId: string) =>
  ["chat", "attachments", roomId] as const;

// A room's attachments, kept live.
export function useRoomAttachments(roomId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: attachmentsKey(roomId ?? ""),
    queryFn: () => fetchRoomAttachments(roomId!),
    enabled: !!roomId,
  });

  useEffect(() => {
    if (!roomId) return;
    const key = attachmentsKey(roomId);
    const channel = supabase
      .channel(`chat:attachments:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_attachments",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const a = toAttachment(payload.new as AttachmentRow);
          qc.setQueryData<ChatAttachment[]>(key, (old) =>
            !old || old.some((x) => x.id === a.id) ? old : [...old, a],
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, qc]);

  return query;
}

// Signed links for a set of paths; refreshed before the 1h links expire.
export function useSignedUrls(paths: string[]) {
  const sorted = useMemo(() => [...new Set(paths)].sort(), [paths]);
  return useQuery({
    queryKey: ["chat", "signed", ...sorted],
    queryFn: () => signChatFiles(sorted),
    enabled: sorted.length > 0,
    staleTime: 50 * 60_000,
    refetchInterval: 50 * 60_000,
  });
}

// Send text + uploaded files in one call; the result lands in both caches.
// Without a connection the message goes to the outbox instead
// (chat-outbox.ts) and is sent later — see useSendMessage.
export function useSendWithAttachments(roomId: string | null) {
  const qc = useQueryClient();
  const { person } = useCurrentPerson();
  return useMutation({
    networkMode: "always",
    mutationFn: async (args: {
      body: string;
      replyToId: string | null;
      attachments: UploadedFile[];
    }): Promise<{
      message: ChatMessage;
      attachments: ChatAttachment[];
    } | null> => {
      if (!roomId || !person) throw new Error("Not ready");
      const id = crypto.randomUUID();
      const queue = async () => {
        await enqueueChatMessage({
          id,
          personId: person.id,
          roomId,
          body: args.body,
          replyToId: args.replyToId,
          uploaded: args.attachments,
        });
        return null;
      };
      if (isOfflineNow()) return queue();
      try {
        return await sendMessageWithAttachments({ id, roomId, ...args });
      } catch (error) {
        if (isNetworkError(error)) return queue();
        throw error;
      }
    },
    onSuccess: (result) => {
      if (!roomId || !result) return;
      const { message, attachments } = result;
      qc.setQueryData<ChatMessage[]>(chatKeys.messages(roomId), (old) =>
        !old || old.some((m) => m.id === message.id) ? old : [...old, message],
      );
      qc.setQueryData<ChatAttachment[]>(attachmentsKey(roomId), (old) => {
        const list = old ?? [];
        const fresh = attachments.filter(
          (a) => !list.some((x) => x.id === a.id),
        );
        return [...list, ...fresh];
      });
    },
  });
}

// ── Composer upload queue ─────────────────────────────────────────────────

export interface UploadItem {
  id: string;
  file: File;
  /** "waiting": no connection — kept here and uploaded once back online,
   *  or sent with the message through the outbox. */
  status: "uploading" | "done" | "error" | "waiting";
  path: string | null;
  previewUrl: string | null;
  error: string | null;
}

// Files attached in the composer: each uploads immediately; the composer
// sends once all are done. Files attached but never sent are deleted from
// storage when removed or when the room closes.
//
// Offline (or when an upload can't reach the server), a file waits instead
// of failing: it uploads by itself once the connection is back, or, if the
// message is sent first, goes into the outbox with it.
export function useChatUploads(roomId: string) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const patch = (id: string, change: Partial<UploadItem>) =>
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...change } : it)),
    );

  const start = useCallback(
    (item: UploadItem) => {
      uploadChatFile(roomId, item.file)
        .then((path) => {
          // Removed while uploading → clean up the orphan.
          if (!itemsRef.current.some((it) => it.id === item.id)) {
            removeChatFile(path).catch(() => {});
            return;
          }
          patch(item.id, { status: "done", path });
        })
        .catch((error) =>
          patch(
            item.id,
            isNetworkError(error)
              ? { status: "waiting" }
              : { status: "error", error: "failed" },
          ),
        );
    },
    [roomId],
  );

  // Back online: upload what was waiting.
  useEffect(() => {
    const onOnline = () => {
      for (const it of itemsRef.current) {
        if (it.status !== "waiting") continue;
        patch(it.id, { status: "uploading" });
        start(it);
      }
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [start]);

  const add = useCallback(
    (files: File[]): string | null => {
      const room = CHAT_MAX_FILES - itemsRef.current.length;
      if (room <= 0) return "tooMany";
      const accepted = files.slice(0, room);

      const offline = isOfflineNow();
      const next: UploadItem[] = accepted.map((file) => {
        const tooBig = file.size > CHAT_MAX_FILE_BYTES;
        return {
          id: crypto.randomUUID(),
          file,
          status: tooBig ? "error" : offline ? "waiting" : "uploading",
          path: null,
          previewUrl: file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : null,
          error: tooBig ? "tooLarge" : null,
        };
      });
      setItems((prev) => [...prev, ...next]);

      for (const item of next) {
        if (item.status === "uploading") start(item);
      }

      return files.length > accepted.length ? "tooMany" : null;
    },
    [start],
  );

  const remove = useCallback((id: string) => {
    const item = itemsRef.current.find((it) => it.id === id);
    if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
    if (item?.path) removeChatFile(item.path).catch(() => {});
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  // After a successful send: forget the items, keep the stored files.
  const reset = useCallback(() => {
    for (const it of itemsRef.current) {
      if (it.previewUrl) URL.revokeObjectURL(it.previewUrl);
    }
    itemsRef.current = [];
    setItems([]);
  }, []);

  // Leaving the room with unsent uploads: delete them.
  useEffect(
    () => () => {
      for (const it of itemsRef.current) {
        if (it.previewUrl) URL.revokeObjectURL(it.previewUrl);
        if (it.path) removeChatFile(it.path).catch(() => {});
      }
    },
    [],
  );

  const done: UploadedFile[] = items
    .filter((it) => it.status === "done" && it.path)
    .map((it) => ({
      path: it.path!,
      name: it.file.name,
      mime: it.file.type || "application/octet-stream",
      size: it.file.size,
    }));

  return {
    items,
    add,
    remove,
    reset,
    done,
    /** Files still waiting for a connection (sent through the outbox). */
    waiting: items.filter((it) => it.status === "waiting").map((it) => it.file),
    uploading: items.some((it) => it.status === "uploading"),
  };
}
