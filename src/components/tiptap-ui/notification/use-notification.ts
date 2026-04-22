import { useEffect } from "react";
import { useNotificationContext } from "./use-notification-context";

export function useNotifications() {
  return useNotificationContext();
}

/**
 * Hook for MentionView — fires the right notification based on mention type.
 *
 * @param mentionId  - The mention's unique id (used as dedup key)
 * @param mentionLabel - Display label e.g. "John Doe", "Today", "Remind me"
 * @param isUserMention - True when the mention is a person (has a role)
 * @param date - The selected date (for date mentions)
 */

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

  useEffect(() => {
    if (!isUserMention) return;
    if (!targetNodeId) return;
    const key = `user-mention:${mentionId}`;
    if (hasNotified(key)) return;
    registerNotified(key);

    addNotification({
      type: "user-mention",
      title: "New mention",
      message: `@${mentionLabel} was mentioned in a note.`,
      mentionId,
      mentionLabel,
      sourcePageId,
      sourcePageTitle,
      targetNodeId,
    });
  }, [isUserMention, mentionId, targetNodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isUserMention || !date) return;
    if (!targetNodeId) return; // ← add guard

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
        mentionId,
        mentionLabel,
        sourcePageId,
        sourcePageTitle,
        targetNodeId,
      });
    } else if (d.getTime() === today.getTime()) {
      const key = `date-due:${mentionId}:today`;
      if (hasNotified(key)) return;
      registerNotified(key);
      addNotification({
        type: "date-due",
        title: "Reminder due today",
        message: `Your reminder for today is due.`,
        mentionId,
        mentionLabel,
        sourcePageId,
        sourcePageTitle,
        targetNodeId, // ← add
      });
    } else if (d.getTime() === tomorrow.getTime()) {
      const key = `date-due:${mentionId}:tomorrow`;
      if (hasNotified(key)) return;
      registerNotified(key);
      addNotification({
        type: "date-due",
        title: "Reminder due tomorrow",
        message: `You have a reminder set for tomorrow.`,
        mentionId,
        mentionLabel,
        sourcePageId,
        sourcePageTitle,
        targetNodeId, // ← add
      });
    }

    // add to the date effect, after the existing due/overdue checks:
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
        const key = `remind:${mentionId}:${remind}:${date.toISOString()}`;
        if (!hasNotified(key)) {
          registerNotified(key);
          addNotification({
            type: "date-due",
            title: "Reminder",
            message:
              remind === "on_day"
                ? `Reminder for ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                : `${remindLabels[remind]} reminder for ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
            mentionId,
            mentionLabel,
            sourcePageId: String(sourcePageId),
            sourcePageTitle,
            targetNodeId,
          });
        }
      }
    }
  }, [isUserMention, mentionId, targetNodeId]); // eslint-disable-line react-hooks/exhaustive-deps
}
