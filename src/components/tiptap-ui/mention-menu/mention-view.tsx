import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";

import "./mention-view.scss";
import { users } from "./users";
import type { MentionItem } from "./types";
import { useMemo, useState } from "react";
import { Card, CardGroupLabel } from "src/components/tiptap-ui-primitive/card";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { Badge } from "src/components/tiptap-ui-primitive/badge";
import CalendarView from "./calendar-view";
import { useMentionNotification } from "../notification";

function getMentionItem(id?: string): MentionItem | undefined {
  if (id) {
    return users.find((user) => user.id === id);
  }

  return undefined;
}

function isPast(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  return d < today;
}

export function MentionView({
  node,
  editor,
  updateAttributes,
}: ReactNodeViewProps) {
  const [today] = useState(new Date());
  const [tomorrow] = useState(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return t;
  });
  // read from attrs instead of local state
  const savedDate = node.attrs.date ? new Date(node.attrs.date) : undefined;
  const [date, setDate] = useState<Date | undefined>(savedDate);

  const handleDateChange = (d: Date) => {
    setDate(d);
    updateAttributes({ date: d.toISOString() }); // ← persist to node attrs
  };
  const activePage = editor.storage.slashCommand.activePage;

  const mentionItem = useMemo(
    () => getMentionItem(node.attrs.id ?? node.attrs.label),
    [node],
  );

  const isUserMention = Boolean(mentionItem?.role);

  // ── Wire up notifications ──────────────────────────────────────────────
  useMentionNotification({
    mentionId: node.attrs.id ?? node.attrs.label ?? "unknown",
    mentionLabel: mentionItem?.label ?? node.attrs.label ?? "",
    isUserMention,
    date,
    sourcePageId: Number(activePage?.id),
    sourcePageTitle: activePage?.title || "New Page",
    targetNodeId: node.attrs.nodeId,
  });

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
            className={`mention-label ${date && isPast(date) ? "mention-past" : ""}`}
          >
            {/* @ {node.attrs.label ?? node.attrs.id} */}@
            {mentionItem?.date && date ? (
              <>
                {date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </>
            ) : (
              <>
                {mentionItem?.label === "Remind me"
                  ? "Tomorrow"
                  : mentionItem?.label}
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <>
            {mentionItem && mentionItem.role ? (
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
            ) : (
              <>
                {mentionItem?.date === "Today" ? (
                  <CalendarView
                    value={date ?? today}
                    onChange={handleDateChange}
                  />
                ) : (
                  <CalendarView
                    value={date ?? tomorrow}
                    onChange={(d) => {
                      setDate(d);
                    }}
                  />
                )}
              </>
            )}
          </>
        </PopoverContent>
      </Popover>
    </NodeViewWrapper>
  );
}
