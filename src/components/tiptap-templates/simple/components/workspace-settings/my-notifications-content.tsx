import { useTranslation } from "react-i18next";
import { AtSign, Calendar, Link2 } from "lucide-react";
import {
  useCurrentPerson,
  queryKeys as sessionQueryKeys,
} from "src/hooks/use-session";
import { useQueryClient } from "@tanstack/react-query";
import { patchPerson } from "src/api/people";
import type { NotificationType } from "src/types";
import "./workspace-settings-content.scss";

function SettingRow({
  label,
  description,
  icon,
  children,
}: {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="ws-setting-row">
      <div className="ws-setting-row__text">
        <span className="ws-setting-row__label">
          {icon}
          {label}
        </span>
        {description && (
          <span className="ws-setting-row__desc">{description}</span>
        )}
      </div>
      <div className="ws-setting-row__control">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={`ws-toggle${checked ? " is-on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="ws-toggle__thumb" />
    </button>
  );
}

// The four types NotifIcon (inbox-panel.tsx) actually branches on. If the
// real NotificationType union has more values, this list needs extending —
// I only have visibility into what that switch statement covers.
const TYPE_ROWS: {
  type: NotificationType;
  icon: React.ReactNode;
  labelKey: string;
  labelFallback: string;
  descKey: string;
  descFallback: string;
}[] = [
  {
    type: "user-mention",
    icon: <AtSign size={15} />,
    labelKey: "settings.notifications.mentions",
    labelFallback: "Mentions",
    descKey: "settings.notifications.mentionsDesc",
    descFallback: "When someone @mentions you.",
  },
  {
    type: "comment-mention",
    icon: <AtSign size={15} />,
    labelKey: "settings.notifications.commentMentions",
    labelFallback: "Comment mentions",
    descKey: "settings.notifications.commentMentionsDesc",
    descFallback: "When someone mentions you in a comment.",
  },
  {
    type: "date-due",
    icon: <Calendar size={15} />,
    labelKey: "settings.notifications.dateDue",
    labelFallback: "Upcoming dates",
    descKey: "settings.notifications.dateDueDesc",
    descFallback: "Reminders for dates coming up soon.",
  },
  {
    type: "date-overdue",
    icon: <Calendar size={15} />,
    labelKey: "settings.notifications.dateOverdue",
    labelFallback: "Overdue dates",
    descKey: "settings.notifications.dateOverdueDesc",
    descFallback: "Reminders for dates that have passed.",
  },
  {
    type: "backlink",
    icon: <Link2 size={15} />,
    labelKey: "settings.notifications.backlinks",
    labelFallback: "Backlinks",
    descKey: "settings.notifications.backlinksDesc",
    descFallback: "When another page links to one of yours.",
  },
];

export function MyNotificationsContent() {
  const { t } = useTranslation();
  const { person } = useCurrentPerson();
  const queryClient = useQueryClient();

  if (!person) {
    return (
      <div className="ws-settings-content__empty">
        {t("settings.notifications.loading", "Loading…")}
      </div>
    );
  }

  const settings = person.notificationSettings ?? {};

  const setType = (type: NotificationType, enabled: boolean) => {
    const next = { ...settings, [type]: enabled };
    patchPerson(person.id, { notificationSettings: next }).then(() => {
      queryClient.invalidateQueries({
        queryKey: sessionQueryKeys.currentPerson,
      });
    });
  };

  return (
    <div className="ws-settings-content">
      <p className="ws-settings-content__intro">
        {t(
          "settings.notifications.intro",
          "Choose which notifications show up in your inbox. Turning a type off hides it from your inbox and unread count — it doesn't stop others from mentioning you or linking your pages.",
        )}
      </p>

      {TYPE_ROWS.map((row) => (
        <SettingRow
          key={row.type}
          icon={row.icon}
          label={t(row.labelKey, row.labelFallback)}
          description={t(row.descKey, row.descFallback)}
        >
          <Toggle
            checked={settings[row.type] ?? true}
            onChange={(v) => setType(row.type, v)}
          />
        </SettingRow>
      ))}
    </div>
  );
}
