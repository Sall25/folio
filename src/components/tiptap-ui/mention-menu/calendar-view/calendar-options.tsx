import { useState } from "react";

interface CalendarOptionsProps {
  endDate?: Date | null;
  dateFormat?: "relative" | "absolute";
  onDateFormatChange?: (fmt: "relative" | "absolute") => void;
  includeTime?: boolean;
  onIncludeTimeChange?: (v: boolean) => void;
  remind?: string | null;
  onRemindChange?: (v: string | null) => void;
  onClear: () => void;
  onEndDateToggle?: (enabled: boolean) => void;
}

const REMIND_OPTIONS = [
  { value: null, label: "None" },
  { value: "on_day", label: "On the day" },
  { value: "1_day_before", label: "1 day before" },
  { value: "2_days_before", label: "2 days before" },
  { value: "1_week_before", label: "1 week before" },
];

export function CalendarOptions({
  endDate,
  dateFormat,
  onDateFormatChange,
  includeTime,
  onIncludeTimeChange,
  remind,
  onRemindChange,
  onClear,
  onEndDateToggle,
}: CalendarOptionsProps) {
  const [remindOpen, setRemindOpen] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);
  const currentRemind = REMIND_OPTIONS.find((o) => o.value === remind);

  return (
    <div className="cv-options">
      <div className="cv-option">
        <span>End date</span>
        <button
          className={`cv-toggle ${endDate ? "cv-toggle--on" : ""}`}
          // in CalendarOptions end date toggle:
          onClick={() => onEndDateToggle?.(!endDate)}
        >
          <span className="cv-toggle__thumb" />
        </button>
      </div>

      <div
        className="cv-option cv-option--chevron"
        onClick={() => setFormatOpen((v) => !v)}
      >
        <span>Date format</span>
        <span className="cv-option__value">
          {dateFormat === "relative" ? "Relative" : "Absolute"}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M4 5l2 2 2-2"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
      {formatOpen && (
        <div className="cv-remind-options">
          {(["relative", "absolute"] as const).map((fmt) => (
            <button
              key={fmt}
              className={`cv-remind-option ${dateFormat === fmt ? "cv-remind-option--active" : ""}`}
              onClick={() => {
                onDateFormatChange?.(fmt);
                setFormatOpen(false);
              }}
            >
              {fmt === "relative" ? "Relative" : "Absolute"}
            </button>
          ))}
        </div>
      )}

      <div className="cv-option">
        <span>Include time</span>
        <button
          className={`cv-toggle ${includeTime ? "cv-toggle--on" : ""}`}
          onClick={() => onIncludeTimeChange?.(!includeTime)}
        >
          <span className="cv-toggle__thumb" />
        </button>
      </div>

      <div
        className="cv-option cv-option--chevron"
        onClick={() => setRemindOpen((v) => !v)}
      >
        <span>Remind</span>
        <span className="cv-option__value">
          {currentRemind?.label ?? "None"}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M4 5l2 2 2-2"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
      {remindOpen && (
        <div className="cv-remind-options">
          {REMIND_OPTIONS.map((opt) => (
            <button
              key={String(opt.value)}
              className={`cv-remind-option ${remind === opt.value ? "cv-remind-option--active" : ""}`}
              onClick={() => {
                onRemindChange?.(opt.value);
                setRemindOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <button className="cv-clear" onClick={onClear}>
        Clear
      </button>

      <div className="cv-learn">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1" />
          <text
            x="7"
            y="10.5"
            textAnchor="middle"
            fontSize="9"
            fill="currentColor"
          >
            ?
          </text>
        </svg>
        <span>Learn about reminders</span>
      </div>
    </div>
  );
}
