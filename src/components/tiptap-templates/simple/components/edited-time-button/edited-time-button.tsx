import { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import type { Page } from "src/types";
import PageActivity from "./page-activity";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { useTranslation } from "react-i18next";
import { formatRelativeTime } from "src/utils/format-relative";
import i18n from "src/i18n/config";
import { useCurrentPerson } from "src/hooks/use-session";

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
  const { t } = useTranslation();
  const { person } = useCurrentPerson();

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
            {t("edited")} {formatRelativeTime(editedAt, t, i18n.language)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end">
        <PageActivity page={page} authorName={person?.name ?? "Unknown"} />
      </PopoverContent>
    </Popover>
  );
}
