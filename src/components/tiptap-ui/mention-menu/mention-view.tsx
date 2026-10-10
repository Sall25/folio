import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { textAroundNode } from "src/lib/notification-context-text";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";

import "./mention-view.scss";
import { users } from "./users";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { relativeDayLabel } from "./date-suggestions";
import { Card, CardGroupLabel } from "src/components/tiptap-ui-primitive/card";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { Badge } from "src/components/tiptap-ui-primitive/badge";
import CalendarView from "./calendar-view/calendar-view";
import { useMentionNotification } from "../../../features/inbox/notification";
import { useActivePageState } from "src/features/pages/context/active-page-context";
import { usePeople } from "src/hooks/use-people";
import type { Person } from "src/types";

function isPast(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

const localeOf = (lang: string | undefined) =>
  lang?.startsWith("fr") ? "fr-FR" : "en-US";

/** Older chips stored no date: "Today" meant today, "Remind me" tomorrow. */
function legacyDate(id: unknown): Date | undefined {
  if (id !== "Today" && id !== "Reminder") return undefined;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (id === "Reminder") d.setDate(d.getDate() + 1);
  return d;
}

export function MentionView({
  node,
  updateAttributes,
  editor,
  getPos,
}: ReactNodeViewProps) {
  const { i18n } = useTranslation();
  const locale = localeOf(i18n.language);

  // The date lives in the node's attrs only (no local copy), so a change
  // made by a collaborator shows up here too.
  const date: Date | undefined = node.attrs.date
    ? new Date(node.attrs.date)
    : legacyDate(node.attrs.id);
  const isDateMention = !!date;

  const handleDateChange = (d: Date) => {
    updateAttributes({ date: d.toISOString() });
  };

  const { activePage } = useActivePageState();

  const { data: people = [] } = usePeople();

  const mentionItem = useMemo(() => {
    const id = node.attrs.id;
    const p = (people as Person[]).find((pp) => String(pp.id) === String(id));
    if (p) return { id: String(p.id), label: p.name, role: "user" };
    // fall back to static users for demo items
    return users.find((u) => u.id === id);
  }, [node, people]);

  const handleRemindChange = (remind: string | null) => {
    updateAttributes({ remind });
  };

  const onIncludeTimeChange = (v: boolean) => {
    if (v && date) {
      // set default time to 12:00 when toggling on
      const withTime = new Date(date);
      withTime.setHours(12, 0, 0, 0);
      updateAttributes({ date: withTime.toISOString(), includeTime: true });
    } else if (!v && date) {
      // strip time when toggling off
      const stripped = new Date(date);
      stripped.setHours(0, 0, 0, 0);
      updateAttributes({ date: stripped.toISOString(), includeTime: false });
    } else {
      updateAttributes({ includeTime: v });
    }
  };

  const isUserMention = !isDateMention && Boolean(mentionItem?.role);
  const remind = node.attrs.remind as string | null;

  // ── Wire up notifications ──────────────────────────────────────────────
  // A date chip notifies only when it has a reminder: "@yesterday" in a note
  // is not an overdue task.
  useMentionNotification({
    mentionId: node.attrs.id ?? node.attrs.label ?? "unknown",
    mentionLabel: mentionItem?.label ?? node.attrs.label ?? "",
    isUserMention,
    date: remind ? date : undefined,
    sourcePageId: activePage?.id,
    sourcePageTitle: activePage?.title || "New Page",
    targetNodeId: node.attrs.nodeId,
    remind,
    // The sentence this mention sits in, quoted in the notification.
    getContext: () => {
      const pos = typeof getPos === "function" ? getPos() : undefined;
      return typeof pos === "number" ? textAroundNode(editor, pos) : "";
    },
  });
  const endDateValue = node.attrs.endDate ? new Date(node.attrs.endDate) : null;

  const absolute = (d: Date) =>
    d.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const dateText = date
    ? (node.attrs.dateFormat === "absolute"
        ? absolute(date)
        : relativeDayLabel(date)) +
      (node.attrs.includeTime
        ? " " +
          date.toLocaleTimeString(locale, {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "") +
      (endDateValue ? ` → ${absolute(endDateValue)}` : "")
    : "";

  return (
    <NodeViewWrapper
      className="mention-wrapper"
      data-node-id={node.attrs.nodeId}
    >
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            data-type="mention"
            className={`mention-label${isDateMention ? " mention-date" : ""}${
              date && remind && isPast(date) ? " mention-past" : ""
            }`}
            title={
              date
                ? date.toLocaleDateString(locale, { dateStyle: "full" })
                : undefined
            }
          >
            @
            {isDateMention
              ? dateText
              : (mentionItem?.label ?? node.attrs.label)}
          </Button>
        </PopoverTrigger>
        <PopoverPortal container={document.getElementById("#root")}>
          <PopoverContent side="right" align="center" style={{ zIndex: 99999 }}>
            <>
              {isDateMention ? (
                <CalendarView
                  value={date ?? new Date()}
                  onChange={handleDateChange}
                  remind={remind}
                  onRemindChange={handleRemindChange}
                  includeTime={node.attrs.includeTime}
                  onIncludeTimeChange={onIncludeTimeChange}
                  dateFormat={node.attrs.dateFormat ?? "relative"}
                  onDateFormatChange={(fmt) =>
                    updateAttributes({ dateFormat: fmt })
                  }
                  endDate={endDateValue}
                  onEndDateChange={(d) =>
                    updateAttributes({
                      endDate: d ? d.toISOString() : null,
                    })
                  }
                />
              ) : mentionItem && mentionItem.role ? (
                <Card
                  style={{
                    minWidth: "10rem",
                  }}
                >
                  <Button
                    variant="ghost"
                    style={{
                      width: "100%",
                      alignItems: "center",
                    }}
                  >
                    <img
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "100%",
                      }}
                      src={mentionItem.avatar}
                      alt="profile"
                    />
                    <CardGroupLabel>{mentionItem.label}</CardGroupLabel>

                    <Spacer orientation="horizontal" />
                    <Badge>{mentionItem.role}</Badge>
                  </Button>
                </Card>
              ) : null}
            </>
          </PopoverContent>
        </PopoverPortal>
      </Popover>
    </NodeViewWrapper>
  );
}
