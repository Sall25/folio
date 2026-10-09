import { useSyncExternalStore } from "react";
import type { QueryClient } from "@tanstack/react-query";
import {
  CHAT_BUCKET,
  chatFilePath,
  sendMessageWithAttachments,
  type ChatAttachment,
  type UploadedFile,
} from "src/api/chat-attachments";
import { supabase } from "src/api/supabase-client";
import type { ChatMessage } from "src/types";
import { isNetworkError, isOfflineNow } from "src/lib/sync-status";

// Chat messages that couldn't be sent yet — written offline, or the send
// failed because the server couldn't be reached. Kept in IndexedDB (files
// included, as blobs), so closing the tab or reloading loses nothing.
//
// ChatOutboxSync sends them, oldest first, when the connection is back. The
// room shows each one in place with a "Waiting to send" clock; one the server
// refuses (removed from the room, file too large…) shows "Not sent" with
// Retry and Delete.
//
// Sending twice is safe: the message id is made once, here, so a send whose
// answer got lost and is tried again hits "duplicate key" — which means it
// went through. Files are uploaded to a fixed path for the same reason.

export interface OutboxFile {
  id: string;
  name: string;
  type: string;
  size: number;
  /** The file itself, until it's uploaded. */
  blob: Blob | null;
  /** Its storage path, once uploaded. */
  path: string | null;
}

export interface OutboxMessage {
  /** Also the id the message gets on the server. */
  id: string;
  personId: string;
  roomId: string;
  body: string;
  replyToId: string | null;
  createdAt: number;
  files: OutboxFile[];
  status: "waiting" | "sending" | "failed";
  error: string | null;
}

/** How a queued message appears in the room (ids start with "pending-",
 *  like the room's own optimistic messages). */
export const OUTBOX_ID_PREFIX = "pending-outbox-";

const DB_NAME = "folio-chat-outbox";
const STORE = "messages";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

function request<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = run(db.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

// ── In memory, for rendering ────────────────────────────────────────────
// A copy of the stored messages so the UI reads them synchronously.

let items: OutboxMessage[] = [];
let loaded: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  roomCache.clear();
  listeners.forEach((l) => l());
}

function load(): Promise<void> {
  if (!loaded) {
    loaded = request<OutboxMessage[]>("readonly", (s) => s.getAll())
      .then((all) => {
        items = all.sort((a, b) => a.createdAt - b.createdAt);
        emit();
      })
      .catch(() => {
        /* storage blocked: the outbox lives in memory only */
      });
  }
  return loaded;
}

async function save(item: OutboxMessage) {
  items = [...items.filter((m) => m.id !== item.id), item].sort(
    (a, b) => a.createdAt - b.createdAt,
  );
  emit();
  try {
    await request("readwrite", (s) => s.put(item));
  } catch {
    /* kept in memory */
  }
}

async function drop(id: string) {
  items = items.filter((m) => m.id !== id);
  emit();
  try {
    await request("readwrite", (s) => s.delete(id));
  } catch {
    /* already gone */
  }
}

function subscribe(listener: () => void) {
  void load();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ── Adding, retrying, deleting ──────────────────────────────────────────

// Two messages queued in the same millisecond still keep their order.
let lastCreatedAt = 0;

export async function enqueueChatMessage(args: {
  id?: string;
  personId: string;
  roomId: string;
  body: string;
  replyToId: string | null;
  /** Files already uploaded (from the composer). */
  uploaded?: UploadedFile[];
  /** Files not uploaded yet. */
  files?: File[];
}): Promise<void> {
  await load();
  const files: OutboxFile[] = [
    ...(args.uploaded ?? []).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      type: f.mime,
      size: f.size,
      blob: null,
      path: f.path,
    })),
    ...(args.files ?? []).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      type: f.type || "application/octet-stream",
      size: f.size,
      blob: f as Blob,
      path: null,
    })),
  ];
  await save({
    id: args.id ?? crypto.randomUUID(),
    personId: args.personId,
    roomId: args.roomId,
    body: args.body,
    replyToId: args.replyToId,
    createdAt: (lastCreatedAt = Math.max(Date.now(), lastCreatedAt + 1)),
    files,
    status: "waiting",
    error: null,
  });
}

export async function retryOutboxMessage(id: string) {
  const item = items.find((m) => m.id === id);
  if (item) await save({ ...item, status: "waiting", error: null });
}

/** Deletes a queued message, and any of its files already uploaded. */
export async function deleteOutboxMessage(id: string) {
  const item = items.find((m) => m.id === id);
  if (!item) return;
  await drop(id);
  const paths = item.files.map((f) => f.path).filter((p): p is string => !!p);
  if (paths.length) {
    void supabase.storage
      .from(CHAT_BUCKET)
      .remove(paths)
      .catch(() => {});
  }
}

/** How many messages this person has queued (asked before signing out). */
export async function countOutboxMessages(personId: string): Promise<number> {
  await load();
  return items.filter((m) => m.personId === personId).length;
}

/** Drops this person's queued messages — a Log out they confirmed. Files
 *  already uploaded for them are deleted too (best effort). */
export async function clearOutboxFor(personId: string): Promise<void> {
  await load();
  const mine = items.filter((m) => m.personId === personId);
  await Promise.all(mine.map((m) => deleteOutboxMessage(m.id)));
}

// ── Reading ─────────────────────────────────────────────────────────────

const roomCache = new Map<string, OutboxMessage[]>();
const EMPTY: OutboxMessage[] = [];

function roomItems(personId: string | null, roomId: string | null) {
  if (!personId || !roomId) return EMPTY;
  const key = `${personId}:${roomId}`;
  let hit = roomCache.get(key);
  if (!hit) {
    hit = items.filter((m) => m.personId === personId && m.roomId === roomId);
    if (hit.length === 0) hit = EMPTY;
    roomCache.set(key, hit);
  }
  return hit;
}

/** This person's queued messages in a room, live. */
export function useOutboxMessages(
  personId: string | null,
  roomId: string | null,
): OutboxMessage[] {
  return useSyncExternalStore(
    subscribe,
    () => roomItems(personId, roomId),
    () => EMPTY,
  );
}

/** How many messages this person has waiting, live (the sync status). */
export function useOutboxCount(personId: string | null): number {
  return useSyncExternalStore(
    subscribe,
    () =>
      personId
        ? items.filter((m) => m.personId === personId && m.status !== "failed")
            .length
        : 0,
    () => 0,
  );
}

/** The queued message behind a "pending-outbox-…" id, live. */
export function useOutboxEntry(messageId: string): OutboxMessage | null {
  const id = messageId.startsWith(OUTBOX_ID_PREFIX)
    ? messageId.slice(OUTBOX_ID_PREFIX.length)
    : null;
  return useSyncExternalStore(
    subscribe,
    () => (id ? (items.find((m) => m.id === id) ?? null) : null),
    () => null,
  );
}

/** A queued message as the room shows it. */
export function outboxToMessage(item: OutboxMessage): ChatMessage {
  return {
    id: `${OUTBOX_ID_PREFIX}${item.id}`,
    roomId: item.roomId,
    authorId: item.personId,
    body: item.body,
    replyToId: item.replyToId,
    createdAt: item.createdAt,
    editedAt: null,
    deletedAt: null,
  };
}

// ── Sending ─────────────────────────────────────────────────────────────

const isDuplicate = (error: unknown) =>
  /duplicate key|already exists|23505/i.test(
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error),
  );

class NetworkProblem extends Error {}

async function uploadFile(roomId: string, file: OutboxFile): Promise<string> {
  const path = chatFilePath(roomId, file.id, file.name);
  const { error } = await supabase.storage
    .from(CHAT_BUCKET)
    .upload(path, file.blob!, { contentType: file.type, upsert: false });
  // Uploaded by an earlier try whose answer got lost: that's fine.
  if (error && !isDuplicate(error)) {
    if (isNetworkError(error)) throw new NetworkProblem(error.message);
    throw new Error(error.message);
  }
  return path;
}

async function sendOne(
  item: OutboxMessage,
  onSent: (message: ChatMessage, attachments: ChatAttachment[]) => void,
): Promise<"sent" | "offline" | "failed"> {
  await save({ ...item, status: "sending", error: null });
  try {
    // Upload what's left; remember each path so a retry skips it.
    const files = [...item.files];
    for (let i = 0; i < files.length; i++) {
      if (files[i].path) continue;
      const path = await uploadFile(item.roomId, files[i]);
      files[i] = { ...files[i], path, blob: null };
      await save({ ...item, files, status: "sending" });
    }
    try {
      const { message, attachments } = await sendMessageWithAttachments({
        id: item.id,
        roomId: item.roomId,
        body: item.body,
        replyToId: item.replyToId,
        attachments: files.map((f) => ({
          path: f.path!,
          name: f.name,
          mime: f.type,
          size: f.size,
        })),
      });
      onSent(message, attachments);
    } catch (error) {
      // Sent by an earlier try whose answer got lost.
      if (!isDuplicate(error)) throw error;
    }
    await drop(item.id);
    return "sent";
  } catch (error) {
    const latest = items.find((m) => m.id === item.id) ?? item;
    if (error instanceof NetworkProblem || isNetworkError(error)) {
      await save({ ...latest, status: "waiting" });
      return "offline";
    }
    await save({
      ...latest,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return "failed";
  }
}

let flushing = false;

/** Sends this person's waiting messages, oldest first. Stops at the first
 *  network problem (still offline). Safe to call often. */
export async function flushChatOutbox(
  personId: string,
  qc: QueryClient,
): Promise<number> {
  await load();
  if (flushing || isOfflineNow()) return 0;
  flushing = true;

  const onSent = (message: ChatMessage, attachments: ChatAttachment[]) => {
    qc.setQueryData<ChatMessage[]>(
      ["chat", "messages", message.roomId],
      (old) =>
        !old || old.some((m) => m.id === message.id) ? old : [...old, message],
    );
    if (attachments.length) {
      qc.setQueryData<ChatAttachment[]>(
        ["chat", "attachments", message.roomId],
        (old) => {
          const list = old ?? [];
          return [
            ...list,
            ...attachments.filter((a) => !list.some((x) => x.id === a.id)),
          ];
        },
      );
    }
  };

  const run = async () => {
    // Another tab may have queued messages since this one loaded.
    try {
      const stored = await request<OutboxMessage[]>("readonly", (s) =>
        s.getAll(),
      );
      items = stored.sort((a, b) => a.createdAt - b.createdAt);
      emit();
    } catch {
      /* keep what's in memory */
    }
    let sent = 0;
    const queue = items.filter(
      (m) => m.personId === personId && m.status !== "failed",
    );
    for (const item of queue) {
      const outcome = await sendOne(item, onSent);
      if (outcome === "offline") break;
      if (outcome === "sent") sent++;
    }
    if (sent > 0) {
      void qc.invalidateQueries({ queryKey: ["chat", "messages"] });
    }
    return sent;
  };

  try {
    if (navigator.locks) {
      return await navigator.locks.request(
        "folio-chat-outbox",
        { ifAvailable: true },
        (lock) => (lock ? run() : 0),
      );
    }
    return await run();
  } finally {
    flushing = false;
  }
}
