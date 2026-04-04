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
}: {
  mentionId: string;
  mentionLabel: string;
  isUserMention: boolean;
  date?: Date;
}) {
  const { addNotification, hasNotified, registerNotified } =
    useNotificationContext();

  // Fire user-mention notification once on mount
  useEffect(() => {
    if (!isUserMention) return;
    const key = `user-mention:${mentionId}`;
    if (hasNotified(key)) return;
    registerNotified(key);
    addNotification({
      type: "user-mention",
      title: "New mention",
      message: `@${mentionLabel} was mentioned in a note.`,
      mentionId,
      mentionLabel,
    });
  }, [isUserMention, mentionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fire date-related notifications whenever the date changes
  useEffect(() => {
    if (isUserMention || !date) return;

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
      });
    }
  }, [date, isUserMention, mentionId]); // eslint-disable-line react-hooks/exhaustive-deps
}
