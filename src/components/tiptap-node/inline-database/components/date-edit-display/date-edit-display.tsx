import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardBody,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import type {
  ConfigOf,
  DatabaseProperty,
  DateFormat,
  TimeFormat,
  DateNotifications,
} from "../../types/types";
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

function RowValue({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="tiptap-button-text"
      style={{ color: "var(--tt-gray-light-500)" }}
    >
      {children}
    </span>
  );
}

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

  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const emit = (patch: Partial<DateConfig>) =>
    onChange({ ...config, ...patch });

  return (
    <Card
      style={{ padding: "5px 10px", boxShadow: "var(--tt-shadow-elevated-sm)" }}
    >
      <CardBody>
        <CardItemGroup>
          {/* Date format */}
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                style={{ width: "100%", justifyContent: "flex-start" }}
              >
                <span className="tiptap-button-text">Date format</span>
                <Spacer orientation="horizontal" />
                <RowValue>{DATE_FORMAT_LABEL[format]}</RowValue>
                <ChevronRight className="tiptap-button-icon-sub" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="left" align="start">
              <Card style={{ padding: "5px 10px", minWidth: 180 }}>
                <CardItemGroup>
                  {(Object.keys(DATE_FORMAT_LABEL) as DateFormat[]).map((f) => (
                    <Button
                      key={f}
                      variant="ghost"
                      style={{
                        justifyContent: "flex-start",
                        width: "100%",
                        fontWeight: f === format ? 600 : 400,
                      }}
                      onClick={() => {
                        emit({ format: f });
                        setDateOpen(false);
                      }}
                    >
                      <span className="tiptap-button-text">
                        {DATE_FORMAT_LABEL[f]}
                      </span>
                    </Button>
                  ))}
                </CardItemGroup>
              </Card>
            </PopoverContent>
          </Popover>

          {/* Include time toggle */}
          <Button
            variant="ghost"
            style={{ width: "100%", justifyContent: "flex-start" }}
            onClick={() => emit({ includeTime: !includeTime })}
          >
            <span className="tiptap-button-text">Include time</span>
            <Spacer orientation="horizontal" />
            <span
              className={`date-edit__switch${includeTime ? " date-edit__switch--on" : ""}`}
              aria-hidden="true"
            >
              <span className="date-edit__switch-knob" />
            </span>
          </Button>

          {/* Time format — only when time is included */}
          {includeTime && (
            <Popover open={timeOpen} onOpenChange={setTimeOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  style={{ width: "100%", justifyContent: "flex-start" }}
                >
                  <span className="tiptap-button-text">Time format</span>
                  <Spacer orientation="horizontal" />
                  <RowValue>{TIME_FORMAT_LABEL[timeFormat]}</RowValue>
                  <ChevronRight className="tiptap-button-icon-sub" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="left" align="start">
                <Card style={{ padding: "5px 10px", minWidth: 140 }}>
                  <CardItemGroup>
                    {(Object.keys(TIME_FORMAT_LABEL) as TimeFormat[]).map(
                      (t) => (
                        <Button
                          key={t}
                          variant="ghost"
                          style={{
                            justifyContent: "flex-start",
                            width: "100%",
                            fontWeight: t === timeFormat ? 600 : 400,
                          }}
                          onClick={() => {
                            emit({ timeFormat: t });
                            setTimeOpen(false);
                          }}
                        >
                          <span className="tiptap-button-text">
                            {TIME_FORMAT_LABEL[t]}
                          </span>
                        </Button>
                      ),
                    )}
                  </CardItemGroup>
                </Card>
              </PopoverContent>
            </Popover>
          )}

          <Separator orientation="horizontal" />

          {/* Notifications */}
          <Popover open={notifOpen} onOpenChange={setNotifOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                style={{ width: "100%", justifyContent: "flex-start" }}
              >
                <span className="tiptap-button-text">Notifications</span>
                <Spacer orientation="horizontal" />
                <RowValue>{NOTIF_LABEL[notifications]}</RowValue>
                <ChevronRight className="tiptap-button-icon-sub" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="left" align="start">
              <Card style={{ padding: "5px 10px", minWidth: 160 }}>
                <CardItemGroup>
                  {(Object.keys(NOTIF_LABEL) as DateNotifications[]).map(
                    (n) => (
                      <Button
                        key={n}
                        variant="ghost"
                        style={{
                          justifyContent: "flex-start",
                          width: "100%",
                          fontWeight: n === notifications ? 600 : 400,
                        }}
                        onClick={() => {
                          emit({ notifications: n });
                          setNotifOpen(false);
                        }}
                      >
                        <span className="tiptap-button-text">
                          {NOTIF_LABEL[n]}
                        </span>
                      </Button>
                    ),
                  )}
                </CardItemGroup>
              </Card>
            </PopoverContent>
          </Popover>
        </CardItemGroup>
      </CardBody>
    </Card>
  );
}
