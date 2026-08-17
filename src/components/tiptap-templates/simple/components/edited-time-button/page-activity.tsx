import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "src/i18n/config";
import type { Page } from "src/types";
import { formatRelativeTime } from "src/utils/format-relative";

interface PageActivityProps {
  page: Page;
  /** Page type carries no author — supply the name from your people/user data. */
  authorName: string;
}

export default function PageActivity({ page, authorName }: PageActivityProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const editedAt = page.updatedAt ?? page.createdAt;
  const { t } = useTranslation();

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
        boxShadow: "var(--tt-shadow-elevated-md)",
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
        {t("activity")}
      </div>

      <div style={{ padding: "8px 14px 10px" }}>
        <ActivityRow
          label={t("editedBy")}
          name={authorName}
          time={formatRelativeTime(editedAt, t, i18n.language)}
        />
        <ActivityRow
          label={t("createdBy")}
          name={authorName}
          time={formatRelativeTime(page.createdAt, t, i18n.language)}
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
