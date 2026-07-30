import type { ID } from "src/types";
import { http } from "./client";
import { newId } from "src/lib/id";

// Matches the json-server dialect your client shim maps to PostgREST, exactly
// like threads.ts. Requires TABLE.notifications and COLUMN.recipientId added to
// client.ts.

// DB/domain shape. Body fields are camelCase here; the shim snake_cases them.
export interface NotificationRecord {
  id: ID;
  recipientId: ID;
  actorId: ID | null;
  type: string;
  title: string;
  message: string;
  read: boolean;
  sourcePageId: ID | null;
  sourcePageTitle: string | null;
  targetNodeId: string | null;
  mentionId: string | null;
  mentionLabel: string | null;
  dedupKey: string | null;
  createdAt: number;
}

// Fetch the current user's notifications (RLS scopes select to recipient = me).
export const fetchNotifications = () =>
  http<NotificationRecord[]>("/notifications");

export const createNotification = (n: NotificationRecord) =>
  http<NotificationRecord>("/notifications", {
    method: "POST",
    body: JSON.stringify(n),
  });

export const patchNotification = (id: ID, patch: Partial<NotificationRecord>) =>
  http<NotificationRecord>(`/notifications/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

export const deleteNotification = (id: ID) =>
  http<void>(`/notifications/${id}`, { method: "DELETE" });

// Mark all my unread as read. The shim maps query filters to .eq(), so this
// PATCHes rows where recipient_id = me AND read = false.
export const markAllNotificationsReadFor = (recipientId: ID) =>
  http<NotificationRecord[]>(
    `/notifications?recipientId=${encodeURIComponent(recipientId)}&read=false`,
    { method: "PATCH", body: JSON.stringify({ read: true }) },
  );

// Build a record from a partial input (fills id/read/createdAt).
export function makeNotification(input: {
  recipientId: ID;
  actorId?: ID | null;
  type: string;
  title: string;
  message: string;
  sourcePageId?: string | number | null;
  sourcePageTitle?: string | null;
  targetNodeId?: string | null;
  mentionId?: string | null;
  mentionLabel?: string | null;
  dedupKey?: string | null;
}): NotificationRecord {
  return {
    id: newId(),
    recipientId: input.recipientId,
    actorId: input.actorId ?? null,
    type: input.type,
    title: input.title,
    message: input.message,
    read: false,
    sourcePageId:
      input.sourcePageId != null ? String(input.sourcePageId) : null,
    sourcePageTitle: input.sourcePageTitle ?? null,
    targetNodeId: input.targetNodeId ?? null,
    mentionId: input.mentionId ?? null,
    mentionLabel: input.mentionLabel ?? null,
    dedupKey: input.dedupKey ?? null,
    createdAt: Date.now(),
  };
}
