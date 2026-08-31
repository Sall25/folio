import {
  Card,
  CardBody,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { MenuRow } from "src/components/tiptap-node/inline-database/components/menu-row";
import { NavigableMenuItem } from "src/components/tiptap-node/inline-database/components/navigable-menu-item";
import type {
  ConfigOf,
  DatabaseProperty,
  DateFormat,
  TimeFormat,
  DateNotifications,
} from "src/types";
import "./date-edit-display.scss";

type DateConfig = ConfigOf<"date">;

const DATE_FORMAT_LABEL: Record<DateFormat, string> = {
  full: "Full date",
  short: "Month/day/year",
  relative: "Relative",
  iso: "ISO (2026-01-04)",
};

const TIME_FORMAT_LABEL: Record<TimeFormat, string> = {
  "12h": "12 hour",
  "24h": "24 hour",
};

const NOTIF_LABEL: Record<DateNotifications, string> = {
  none: "None",
  same_day: "Same day",
  "1_day_before": "1 day before",
  "2_days_before": "2 days before",
};

export function DateEditDisplay({
  prop,
  onChange,
}: {
  prop: DatabaseProperty;
  onChange: (config: DateConfig) => void;
}) {
  const config = prop.config as DateConfig;
  const format = config.format ?? "full";
  const timeFormat = config.timeFormat ?? "12h";
  const includeTime = config.includeTime ?? false;
  const notifications = config.notifications ?? "none";

  const emit = (patch: Partial<DateConfig>) =>
    onChange({ ...config, ...patch });

  return (
    <Card style={{ padding: "5px 10px", borderRadius: "var(--tt-radius-sm)" }}>
      <CardBody>
        <CardItemGroup>
          {/* Date format */}
          <NavigableMenuItem
            label="Date format"
            sub={DATE_FORMAT_LABEL[format]}
            side="left"
          >
            <Card
              style={{
                padding: "5px 10px",
                borderRadius: "var(--tt-radius-sm)",
              }}
            >
              <CardItemGroup>
                {(Object.keys(DATE_FORMAT_LABEL) as DateFormat[]).map((f) => (
                  <MenuRow
                    key={f}
                    label={DATE_FORMAT_LABEL[f]}
                    selected={f === format}
                    onClick={() => emit({ format: f })}
                  />
                ))}
              </CardItemGroup>
            </Card>
          </NavigableMenuItem>

          {/* Include time toggle */}
          <MenuRow
            label="Include time"
            toggle
            checked={includeTime}
            onToggle={() => emit({ includeTime: !includeTime })}
          />

          {/* Time format — only when time is included */}
          {includeTime && (
            <NavigableMenuItem
              label="Time format"
              sub={TIME_FORMAT_LABEL[timeFormat]}
              side="left"
            >
              <Card
                style={{
                  padding: "5px 10px",
                  borderRadius: "var(--tt-radius-sm)",
                }}
              >
                <CardItemGroup>
                  {(Object.keys(TIME_FORMAT_LABEL) as TimeFormat[]).map((t) => (
                    <MenuRow
                      key={t}
                      label={TIME_FORMAT_LABEL[t]}
                      selected={t === timeFormat}
                      onClick={() => emit({ timeFormat: t })}
                    />
                  ))}
                </CardItemGroup>
              </Card>
            </NavigableMenuItem>
          )}

          <Separator orientation="horizontal" />

          {/* Notifications */}
          <NavigableMenuItem
            label="Notifications"
            sub={NOTIF_LABEL[notifications]}
            side="left"
          >
            <Card
              style={{
                padding: "5px 10px",
                borderRadius: "var(--tt-radius-sm)",
              }}
            >
              <CardItemGroup>
                {(Object.keys(NOTIF_LABEL) as DateNotifications[]).map((n) => (
                  <MenuRow
                    key={n}
                    label={NOTIF_LABEL[n]}
                    selected={n === notifications}
                    onClick={() => emit({ notifications: n })}
                  />
                ))}
              </CardItemGroup>
            </Card>
          </NavigableMenuItem>
        </CardItemGroup>
      </CardBody>
    </Card>
  );
}
