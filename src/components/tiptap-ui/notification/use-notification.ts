import { useEffect } from "react";
import { useNotificationContext } from "./use-notification-context";

// PATCHED useMentionNotification — user mentions now target the MENTIONED
// PERSON as recipient (so it lands in THEIR bell, cross-user), with a DB-level
// dedupKey. Date reminders stay self-directed (no recipientId → defaults to the
// current user in the provider). Merge over your existing use-notification.ts.

export function useNotifications() {
  return useNotificationContext();
}

export function useMentionNotification({
  mentionId,
  mentionLabel,
  isUserMention,
  date,
  sourcePageId,
  sourcePageTitle,
  targetNodeId,
  remind,
}: {
  mentionId: string;
  mentionLabel: string;
  isUserMention: boolean;
  date?: Date;
  sourcePageId?: string | number;
  sourcePageTitle?: string;
  targetNodeId?: string;
  remind?: string | null;
}) {
  const { addNotification, hasNotified, registerNotified } =
    useNotificationContext();

  // ── User mention → notify the MENTIONED PERSON ──────────────────────────
  useEffect(() => {
    if (!isUserMention) return;
    if (!targetNodeId) return;
    const key = `user-mention:${mentionId}:${targetNodeId}`;
    if (hasNotified(key)) return;
    registerNotified(key);

    addNotification({
      type: "user-mention",
      title: "New mention",
      message: `You were mentioned in ${sourcePageTitle ?? "a note"}.`,
      recipientId: mentionId,
      dedupKey: key,
      mentionId,
      mentionLabel,
      sourcePageId,
      sourcePageTitle,
      targetNodeId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUserMention, mentionId, targetNodeId]);

  // ── Date reminders → self-directed (recipient defaults to current user) ──
  useEffect(() => {
    if (isUserMention || !date) return;
    if (!targetNodeId) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const dateKey = d.toISOString().split("T")[0];

    if (d < today) {
      const key = `date-overdue:${mentionId}:${dateKey}`;
      if (hasNotified(key)) return;
      registerNotified(key);
      addNotification({
        type: "date-overdue",
        title: "Overdue reminder",
        message: `A reminder set for ${date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })} is past due.`,
        dedupKey: key,
        mentionId,
        mentionLabel,
        sourcePageId,
        sourcePageTitle,
        targetNodeId,
      });
    } else if (d.getTime() === today.getTime()) {
      const key = `date-due:${mentionId}:today:${dateKey}`;
      if (hasNotified(key)) return;
      registerNotified(key);
      addNotification({
        type: "date-due",
        title: "Reminder due today",
        message: `Your reminder for today is due.`,
        dedupKey: key,
        mentionId,
        mentionLabel,
        sourcePageId,
        sourcePageTitle,
        targetNodeId,
      });
    } else if (d.getTime() === tomorrow.getTime()) {
      const key = `date-due:${mentionId}:tomorrow:${dateKey}`;
      if (hasNotified(key)) return;
      registerNotified(key);
      addNotification({
        type: "date-due",
        title: "Reminder due tomorrow",
        message: `You have a reminder set for tomorrow.`,
        dedupKey: key,
        mentionId,
        mentionLabel,
        sourcePageId,
        sourcePageTitle,
        targetNodeId,
      });
    }

    if (remind && remind !== "none" && date) {
      const remindLabels: Record<string, string> = {
        on_day: "On the day",
        "1_day_before": "1 day before",
        "2_days_before": "2 days before",
        "1_week_before": "1 week before",
      };
      const remindOffsets: Record<string, number> = {
        on_day: 0,
        "1_day_before": -1,
        "2_days_before": -2,
        "1_week_before": -7,
      };

      const offset = remindOffsets[remind] ?? 0;
      const remindDate = new Date(date);
      remindDate.setDate(remindDate.getDate() + offset);
      remindDate.setHours(0, 0, 0, 0);

      const todayNorm = new Date();
      todayNorm.setHours(0, 0, 0, 0);

      if (remindDate.getTime() === todayNorm.getTime()) {
        const key = `remind:${mentionId}:${remind}:${dateKey}`;
        if (!hasNotified(key)) {
          registerNotified(key);
          addNotification({
            type: "date-due",
            title: "Reminder",
            message:
              remind === "on_day"
                ? `Reminder for ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                : `${remindLabels[remind]} reminder for ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
            dedupKey: key,
            mentionId,
            mentionLabel,
            sourcePageId,
            sourcePageTitle,
            targetNodeId,
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUserMention, mentionId, targetNodeId]);
}
