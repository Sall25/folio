import { supabase } from "./supabase-client";
import { toMessage, type MessageRow } from "./chat";
import { type ChatMessage } from "src/types";

export const CHAT_BUCKET = "chat-attachments";
export const CHAT_MAX_FILE_BYTES = 25 * 1024 * 1024;
export const CHAT_MAX_FILES = 10;

export interface ChatAttachment {
  id: string;
  roomId: string;
  messageId: string;
  path: string;
  name: string;
  mime: string;
  size: number;
}

export interface AttachmentRow {
  id: string;
  room_id: string;
  message_id: string;
  path: string;
  name: string;
  mime: string;
  size: number;
}

export interface UploadedFile {
  path: string;
  name: string;
  mime: string;
  size: number;
}

export const toAttachment = (r: AttachmentRow): ChatAttachment => ({
  id: r.id,
  roomId: r.room_id,
  messageId: r.message_id,
  path: r.path,
  name: r.name,
  mime: r.mime,
  size: Number(r.size),
});

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

// Storage keys can't hold every character — keep the original name in the
// metadata row and a safe version in the path.
function safeFileName(name: string): string {
  const cleaned = name.replace(/[^\w.-]+/g, "_").replace(/_+/g, "_");
  return cleaned.slice(-120) || "file";
}

export async function fetchRoomAttachments(
  roomId: string,
): Promise<ChatAttachment[]> {
  const { data, error } = await supabase
    .from("chat_attachments")
    .select("id, room_id, message_id, path, name, mime, size")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });
  fail(error);
  return ((data ?? []) as AttachmentRow[]).map(toAttachment);
}

// Upload into the room's folder; returns the storage path.
export async function uploadChatFile(
  roomId: string,
  file: File,
): Promise<string> {
  const path = `${roomId}/${crypto.randomUUID()}/${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from(CHAT_BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  fail(error);
  return path;
}

export async function removeChatFile(path: string): Promise<void> {
  const { error } = await supabase.storage.from(CHAT_BUCKET).remove([path]);
  fail(error);
}

// Short-lived links (1h) for a batch of paths.
export async function signChatFiles(
  paths: string[],
): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data, error } = await supabase.storage
    .from(CHAT_BUCKET)
    .createSignedUrls(paths, 3600);
  fail(error);
  const out: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  }
  return out;
}

export async function sendMessageWithAttachments(args: {
  id: string;
  roomId: string;
  body: string;
  replyToId: string | null;
  attachments: UploadedFile[];
}): Promise<{ message: ChatMessage; attachments: ChatAttachment[] }> {
  const { data, error } = await supabase.rpc("send_chat_message", {
    p_id: args.id,
    p_room: args.roomId,
    p_body: args.body,
    p_reply_to: args.replyToId,
    p_attachments: args.attachments,
  });
  fail(error);
  const result = data as { message: MessageRow; attachments: AttachmentRow[] };
  return {
    message: toMessage(result.message),
    attachments: (result.attachments ?? []).map(toAttachment),
  };
}