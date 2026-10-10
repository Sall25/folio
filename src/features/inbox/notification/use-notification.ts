import { useEffect, useRef } from "react";
import { useNotificationActions } from "./notification-context";
import { useCurrentPerson } from "src/hooks/use-session";

// A mention notification waits this long before it's sent, so the sentence
// around it is written by then and goes along as its message. Sent at once
// if the mention leaves the screen first (the page is closed…).
const MENTION_DELAY_MS = 8000;

// PATCHED useMentionNotification — user mentions now target the MENTIONED
// PERSON as recipient (so it lands in THEIR bell, cross-user), with a DB-level
// dedupKey. Date reminders stay self-directed (no recipientId → defaults to the
// current user in the provider). Merge over your existing use-notification.ts.

export function useMentionNotification({
  mentionId,
  mentionLabel,
  isUserMention,
  date,
  sourcePageId,
  sourcePageTitle,
  targetNodeId,
  remind,
  getContext,
}: {
  mentionId: string;
  mentionLabel: string;
  isUserMention: boolean;
  date?: Date;
  sourcePageId?: string | number;
  sourcePageTitle?: string;
  targetNodeId?: string;
  remind?: string | null;
  /** The sentence around the mention, quoted as the notification's
   *  message so it makes sense without opening the page. */
  getContext?: () => string;
}) {
  const { hasNotified, addNotification, registerNotified } =
    useNotificationActions();
  const { person } = useCurrentPerson();
  const authorName = person?.name;

  // Read when the notification is sent, not when the hook first ran.
  const getContextRef = useRef(getContext);
  useEffect(() => {
    getContextRef.current = getContext;
  });
  const quote = () => {
    try {
      return getContextRef.current?.() ?? "";
    } catch {
      return "";
    }
  };
  const page = sourcePageTitle || "a page";
  /** "Reminder due today · Lab report", so the list says where. */
  const inPage = (title: string) =>
    sourcePageTitle ? `${title} · ${sourcePageTitle}` : title;

  // ── User mention → notify the MENTIONED PERSON ──────────────────────────
  useEffect(() => {
    if (!isUserMention) return;
    if (!targetNodeId) return;
    const key = `user-mention:${mentionId}:${targetNodeId}`;
    if (hasNotified(key)) return;
    registerNotified(key);

    // Sent a little later, with the sentence the mention ended up in.
    let sent = false;
    const firstQuote = quote();
    const send = () => {
      if (sent) return;
      sent = true;
      addNotification({
        type: "user-mention",
        title: authorName
          ? `${authorName} mentioned you in ${page}`
          : `You were mentioned in ${page}`,
        message: quote() || firstQuote || `You were mentioned in ${page}.`,
        recipientId: mentionId,
        dedupKey: key,
        mentionId,
        mentionLabel,
        sourcePageId,
        sourcePageTitle,
        targetNodeId,
      });
    };
    const timer = window.setTimeout(send, MENTION_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      send();
    };
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
        title: inPage("Overdue reminder"),
        message:
          quote() ||
          `A reminder set for ${date.toLocaleDateString("en-US", {
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
        title: inPage("Reminder due today"),
        message: quote() || `Your reminder for today is due.`,
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
        title: inPage("Reminder due tomorrow"),
        message: quote() || `You have a reminder set for tomorrow.`,
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
            title: inPage("Reminder"),
            message:
              quote() ||
              (remind === "on_day"
                ? `Reminder for ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                : `${remindLabels[remind]} reminder for ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`),
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
