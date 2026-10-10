import type { JSONContent } from "@tiptap/core";
import { FlaskConical } from "lucide-react";
import { useNotificationActions } from "src/features/inbox/notification/notification-context";
import { useOptionalActivePage } from "src/features/pages/context/active-page-context";
import { useCurrentPerson } from "src/hooks/use-session";

// DEVELOPMENT ONLY (rendered behind import.meta.env.DEV, so it's left out
// of production builds). Real notifications need a second person, or a
// date reminder that falls due, so there was no quick way to see them while
// working on the inbox. This button sends you three test notifications for
// the page that's open:
//   - a mention and a reminder that point at the LAST block of the page (to
//     test scrolling to a notification), quoting that block's text;
//   - a comment mention with a long message (to test the side card).
// Each click sends new ones (unique dedup keys).

const MAX_QUOTE = 140;

type Block = { id: string; text: string; mentionNodeId?: string };

/** Blocks with an id, in order, with their text; the last mention's
 *  nodeId when the block has one. */
function blocksOf(content: JSONContent | null | undefined): Block[] {
  const out: Block[] = [];
  const textOf = (n: JSONContent): string =>
    n.type === "text"
      ? (n.text ?? "")
      : n.type === "mention"
        ? `@${n.attrs?.label ?? ""}`
        : (n.content ?? []).map(textOf).join(n.type === "doc" ? " " : "");
  const mentionIn = (n: JSONContent): string | undefined => {
    if (n.type === "mention" && n.attrs?.nodeId) return String(n.attrs.nodeId);
    for (const c of n.content ?? []) {
      const found = mentionIn(c);
      if (found) return found;
    }
    return undefined;
  };
  const walk = (n: JSONContent) => {
    const id = n.attrs?.id;
    if (id && n.type !== "mention" && n.type !== "title") {
      const text = textOf(n).replace(/\s+/g, " ").trim();
      if (text) out.push({ id: String(id), text, mentionNodeId: mentionIn(n) });
    }
    (n.content ?? []).forEach(walk);
  };
  if (content) walk(content);
  return out;
}

const clip = (s: string) =>
  s.length > MAX_QUOTE ? s.slice(0, MAX_QUOTE - 1) + "…" : s;

export function DevTestNotifications() {
  const { addNotification } = useNotificationActions();
  const { activePage } = useOptionalActivePage();
  const { person } = useCurrentPerson();

  const send = () => {
    if (!activePage) return;
    const page = activePage.title || "New Page";
    const blocks = blocksOf(activePage.content);
    const last = blocks[blocks.length - 1];
    const withMention = [...blocks].reverse().find((b) => b.mentionNodeId);
    const stamp = Date.now();
    const base = {
      sourcePageId: activePage.id,
      sourcePageTitle: page,
    };

    addNotification({
      ...base,
      type: "user-mention",
      title: `${person?.name ?? "Someone"} mentioned you in ${page}`,
      message: clip((withMention ?? last)?.text ?? "Test mention."),
      targetNodeId: withMention?.mentionNodeId ?? last?.id,
      dedupKey: `dev:${stamp}:mention`,
    });
    addNotification({
      ...base,
      type: "date-due",
      title: `Reminder due today · ${page}`,
      message: clip(last?.text ?? "Test reminder."),
      targetNodeId: last?.id,
      dedupKey: `dev:${stamp}:reminder`,
    });
    addNotification({
      ...base,
      type: "comment-mention",
      title: `${person?.name ?? "Someone"} mentioned you in a comment · ${page}`,
      message:
        "This is a long test comment to check the side card: it should show the whole message, wrap nicely, and stay readable. " +
        "Hover the notification, move onto the card, try Mark as read and Dismiss, then Open to jump to the block at the end of the page.",
      targetNodeId: last?.id,
      dedupKey: `dev:${stamp}:comment`,
    });
  };

  return (
    <button
      type="button"
      className="inbox-panel__mark-all"
      onClick={send}
      disabled={!activePage}
      // Dev-only control: not translated.
      aria-label="Send test notifications (dev)"
    >
      <FlaskConical size={13} />
      <span>{activePage ? "Test" : "Open a page"}</span>
    </button>
  );
}
