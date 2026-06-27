import { useState, useRef, useEffect } from "react";
import type { Page } from "src/types";

// Recent → relative ("Just now", "3m ago", "2h ago", "Yesterday"),
// older → absolute date ("Mar 29"). updatedAt can be null → caller falls back.
function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 0) return "Just now";
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

interface PageActivityProps {
  page: Page;
  /** Page type carries no author — supply the name from your people/user data. */
  authorName: string;
}

export default function PageActivity({ page, authorName }: PageActivityProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const editedAt = page.updatedAt ?? page.createdAt;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        right: -30,
        minWidth: 280,
        background: "var(--tt-card-bg-color)",
        border: "1px solid var(--tt-border-color)",
        borderRadius: "var(--tt-radius-lg)",
        boxShadow: "var(--tt-shadow-elevated-sm)",
        overflow: "hidden",
        zIndex: 50,
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--tt-text-color)",
          borderBottom: "1px solid var(--tt-border-color)",
        }}
      >
        Activity
      </div>

      <div style={{ padding: "8px 14px 10px" }}>
        <ActivityRow
          label="Edited by"
          name={authorName}
          time={formatRelative(editedAt)}
        />
        <ActivityRow
          label="Created by"
          name={authorName}
          time={formatRelative(page.createdAt)}
        />
      </div>
    </div>
  );
}

function ActivityRow({
  label,
  name,
  time,
}: {
  label: string;
  name: string;
  time: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "6px 0",
      }}
    >
      <span style={{ fontSize: 13, color: "var(--tt-text-color)" }}>
        {label} <strong style={{ fontWeight: 600 }}>{name}</strong>
      </span>
      <span
        style={{
          fontSize: 12,
          color: "var(--tt-theme-muted)",
          whiteSpace: "nowrap",
        }}
      >
        {time}
      </span>
    </div>
  );
}
