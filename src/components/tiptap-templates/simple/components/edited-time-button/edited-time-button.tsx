import { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import type { Page } from "src/types";
import PageActivity from "./page-activity";
import { Button } from "src/components/tiptap-ui-primitive/button";

// Recent → relative; older → absolute date. Mirrors useRecentPages' fallback.
function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "Yesterday";
  if (day < 7) return `${day}d ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// Re-render on an interval so "1m ago" advances on its own, no reload needed.
function useNow(intervalMs = 30000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

interface EditedTimeButtonProps {
  page: Page;
  /** Pass PageActivity's toggle here to use this as the popover trigger. */
  onClick?: () => void;
  active?: boolean;
}

export default function EditedTimeButton({
  page,
  onClick,
  active = false,
}: EditedTimeButtonProps) {
  useNow();
  const editedAt = page.updatedAt ?? page.createdAt;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          onClick={onClick}
          onMouseEnter={(e) =>
            onClick &&
            (e.currentTarget.style.background = "var(--tt-card-bg-color)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = active
              ? "var(--tt-card-bg-color)"
              : "transparent")
          }
        >
          <span
            className="tiptap-button-text"
            style={{
              fontSize: 14,
              fontWeight: 400,
              lineHeight: 1.4,
              color: "var(--tt-text-color)",
              fontFamily:
                'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Display", "Segoe UI", Helvetica, "Apple Color Emoji", "Noto Sans Arabic", "Noto Sans Hebrew", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"',
            }}
          >
            {" "}
            Edited {formatRelative(editedAt)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end">
        <PageActivity page={page} authorName="Souleymane Sall" />
      </PopoverContent>
    </Popover>
  );
}
