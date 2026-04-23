import { useState, useCallback } from "react";
import { formatDate, formatTime, parseTime } from "./utils";
import { CalendarHeader } from "./calendar-header";
import { CalendarGrid } from "./calendar-grid";
import { CalendarTimeInput } from "./calendar-time-input";
import { CalendarOptions } from "./calendar-options";

import "./calendar-view.scss";

export interface CalendarViewProps {
  value?: Date;
  onChange?: (date: Date) => void;
  remind?: string | null;
  onRemindChange?: (remind: string | null) => void;
  minDate?: Date;
  maxDate?: Date;
  includeTime?: boolean;
  onIncludeTimeChange?: (v: boolean) => void;
  dateFormat?: "relative" | "absolute";
  onDateFormatChange?: (format: "relative" | "absolute") => void;
  endDate?: Date | null;
  onEndDateChange?: (date: Date | null) => void;
}

// export function CalendarView({
//   value,
//   onChange,
//   minDate,
//   maxDate,
//   remind,
//   onRemindChange,
//   includeTime,
//   onIncludeTimeChange,
//   dateFormat,
//   onDateFormatChange,
// }: CalendarViewProps) {
//   const REMIND_OPTIONS = [
//     { value: null, label: "None" },
//     { value: "on_day", label: "On the day" },
//     { value: "1_day_before", label: "1 day before" },
//     { value: "2_days_before", label: "2 days before" },
//     { value: "1_week_before", label: "1 week before" },
//   ];

//   const [remindOpen, setRemindOpen] = useState(false);
//   const currentRemind = REMIND_OPTIONS.find((o) => o.value === remind);
//   // state for dropdown
//   const [formatOpen, setFormatOpen] = useState(false);

//   const today = new Date();
//   const [anchor, setAnchor] = useState<Date>(value ?? today);
//   const [selected, setSelected] = useState<Date | undefined>(value);
//   const [endDate, setEndDate] = useState(false);

//   const [timeInput, setTimeInput] = useState(() => {
//     if (value && includeTime) return formatTime(value);
//     return "12:00 PM";
//   });

//   const handleTimeBlur = () => {
//     const parsed = parseTime(timeInput);
//     if (parsed && selected) {
//       const newDate = new Date(selected);
//       newDate.setHours(parsed.hours, parsed.minutes, 0, 0);
//       // format back to display string
//       const display = newDate.toLocaleTimeString("en-US", {
//         hour: "2-digit",
//         minute: "2-digit",
//         hour12: true,
//       });
//       setTimeInput(display);
//       onChange?.(newDate);
//     } else {
//       // invalid — reset to last valid time
//       if (selected) {
//         setTimeInput(
//           selected.toLocaleTimeString("en-US", {
//             hour: "2-digit",
//             minute: "2-digit",
//             hour12: true,
//           }),
//         );
//       }
//     }
//   };

//   const handleSelect = useCallback(
//     (date: Date) => {
//       setSelected(date);
//       if (includeTime) {
//         setTimeInput(formatTime(date));
//       }
//       onChange?.(date);
//     },
//     [onChange, includeTime],
//   );

//   const navigatePrev = () =>
//     setAnchor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));

//   const navigateNext = () =>
//     setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

//   const goToToday = () => {
//     setAnchor(today);
//     handleSelect(today);
//   };

//   const cells = getMonthGrid(anchor.getFullYear(), anchor.getMonth());

//   return (
//     <div className="cv">
//       {/* Date input */}
//       <div className="cv-input">
//         <span>
//           {selected
//             ? includeTime
//               ? selected.toLocaleDateString("en-US", {
//                   month: "short",
//                   day: "numeric",
//                   year: "numeric",
//                 }) +
//                 " " +
//                 timeInput
//               : formatDate(selected)
//             : "No date selected"}
//         </span>
//       </div>

//       {/* Header */}
//       <div className="cv-header">
//         <span className="cv-header__label">
//           {MONTHS_FULL[anchor.getMonth()]} {anchor.getFullYear()}
//         </span>
//         <div className="cv-header__right">
//           <button className="cv-today-btn" onClick={goToToday}>
//             Today
//           </button>
//           <button
//             className="cv-nav__btn"
//             onClick={navigatePrev}
//             aria-label="Previous"
//           >
//             <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
//               <path
//                 d="M9 2L4 7L9 12"
//                 stroke="currentColor"
//                 strokeWidth="1.5"
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//               />
//             </svg>
//           </button>
//           <button
//             className="cv-nav__btn"
//             onClick={navigateNext}
//             aria-label="Next"
//           >
//             <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
//               <path
//                 d="M5 2L10 7L5 12"
//                 stroke="currentColor"
//                 strokeWidth="1.5"
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//               />
//             </svg>
//           </button>
//         </div>
//       </div>

//       {/* Day labels */}
//       <div className="cv-day-labels">
//         {DAYS_SHORT.map((d) => (
//           <span key={d} className="cv-day-label">
//             {d}
//           </span>
//         ))}
//       </div>

//       {/* Grid */}
//       <div className="cv-grid">
//         {cells.map((date, i) => {
//           const isCurrentMonth = date.getMonth() === anchor.getMonth();
//           const isSelected = !!selected && isSameDay(date, selected);
//           const isToday = isSameDay(date, today);
//           const disabled =
//             (minDate && date < minDate) || (maxDate && date > maxDate);

//           return (
//             <button
//               key={i}
//               type="button"
//               className="cv-day"
//               data-current-month={isCurrentMonth || undefined}
//               data-selected={isSelected || undefined}
//               data-today={isToday || undefined}
//               data-disabled={disabled || undefined}
//               onClick={disabled ? undefined : () => handleSelect(date)}
//             >
//               {date.getDate()}
//             </button>
//           );
//         })}
//       </div>

//       {includeTime && (
//         <div className="cv-time">
//           <input
//             type="text"
//             className="cv-time__input"
//             value={timeInput}
//             onChange={(e) => setTimeInput(e.target.value)}
//             onBlur={handleTimeBlur}
//             onKeyDown={(e) => {
//               if (e.key === "Enter") handleTimeBlur();
//             }}
//             placeholder="e.g. 2:30 PM"
//           />
//         </div>
//       )}

//       {/* Options */}
//       <div className="cv-options">
//         <div className="cv-option">
//           <span>End date</span>
//           <button
//             className={`cv-toggle ${endDate ? "cv-toggle--on" : ""}`}
//             onClick={() => setEndDate((v) => !v)}
//             aria-label="Toggle end date"
//           >
//             <span className="cv-toggle__thumb" />
//           </button>
//         </div>

//         <div
//           className="cv-option cv-option--chevron"
//           onClick={() => setFormatOpen((v) => !v)}
//         >
//           <span>Date format</span>
//           <span className="cv-option__value">
//             {dateFormat === "relative" ? "Relative" : "Absolute"}
//             <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
//               <path
//                 d="M4 5l2 2 2-2"
//                 stroke="currentColor"
//                 strokeWidth="1.5"
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//               />
//             </svg>
//           </span>
//         </div>

//         {formatOpen && (
//           <div className="cv-remind-options">
//             {(["relative", "absolute"] as const).map((fmt) => (
//               <button
//                 key={fmt}
//                 className={`cv-remind-option ${dateFormat === fmt ? "cv-remind-option--active" : ""}`}
//                 onClick={() => {
//                   onDateFormatChange?.(fmt);
//                   setFormatOpen(false);
//                 }}
//               >
//                 {fmt === "relative" ? "Relative" : "Absolute"}
//               </button>
//             ))}
//           </div>
//         )}

//         <div className="cv-option">
//           <span>Include time</span>
//           <button
//             className={`cv-toggle ${includeTime ? "cv-toggle--on" : ""}`}
//             onClick={() => onIncludeTimeChange?.(!includeTime)}
//             aria-label="Toggle include time"
//           >
//             <span className="cv-toggle__thumb" />
//           </button>
//         </div>

//         <div
//           className="cv-option cv-option--chevron"
//           onClick={() => setRemindOpen((v) => !v)}
//         >
//           <span>Remind</span>
//           <span className="cv-option__value">
//             {currentRemind?.label ?? "None"}
//             <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
//               <path
//                 d="M4 5l2 2 2-2"
//                 stroke="currentColor"
//                 strokeWidth="1.5"
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//               />
//             </svg>
//           </span>
//         </div>

//         {remindOpen && (
//           <div className="cv-remind-options">
//             {REMIND_OPTIONS.map((opt) => (
//               <button
//                 key={String(opt.value)}
//                 className={`cv-remind-option ${remind === opt.value ? "cv-remind-option--active" : ""}`}
//                 onClick={() => {
//                   onRemindChange?.(opt.value);
//                   setRemindOpen(false);
//                 }}
//               >
//                 {opt.label}
//               </button>
//             ))}
//           </div>
//         )}

//         <button className="cv-clear" onClick={() => setSelected(undefined)}>
//           Clear
//         </button>

//         <div className="cv-learn">
//           <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
//             <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1" />
//             <text
//               x="7"
//               y="10.5"
//               textAnchor="middle"
//               fontSize="9"
//               fill="currentColor"
//             >
//               ?
//             </text>
//           </svg>
//           <span>Learn about reminders</span>
//         </div>
//       </div>
//     </div>
//   );
// }

export function CalendarView({
  value,
  onChange,
  minDate,
  maxDate,
  remind,
  onRemindChange,
  includeTime,
  onIncludeTimeChange,
  dateFormat,
  onDateFormatChange,
  endDate,
  onEndDateChange,
}: CalendarViewProps) {
  const today = new Date();
  const [anchor, setAnchor] = useState<Date>(value ?? today);
  const [selected, setSelected] = useState<Date | undefined>(value);
  const [timeInput, setTimeInput] = useState(() => {
    if (value && includeTime) return formatTime(value);
    return "12:00 PM";
  });
  const [selectingEnd, setSelectingEnd] = useState(false);

  const handleSelect = useCallback(
    (date: Date) => {
      if (endDate) {
        // range mode — move whichever boundary is closer
        const distToStart = selected
          ? Math.abs(date.getTime() - selected.getTime())
          : Infinity;
        const distToEnd = Math.abs(date.getTime() - endDate.getTime());

        if (distToEnd < distToStart) {
          // move end date
          if (date < (selected ?? date)) {
            // new end before start — swap
            onEndDateChange?.(selected!);
            setSelected(date);
            onChange?.(date);
          } else {
            onEndDateChange?.(date);
          }
        } else {
          // move start date (closer or equal distance)
          if (date > endDate) {
            // new start after end — swap
            setSelected(endDate);
            onChange?.(endDate);
            onEndDateChange?.(date);
          } else {
            setSelected(date);
            if (includeTime) setTimeInput(formatTime(date));
            onChange?.(date);
          }
        }
      } else if (selectingEnd) {
        // first end date selection
        if (selected && date < selected) {
          onEndDateChange?.(selected);
          setSelected(date);
          onChange?.(date);
        } else {
          onEndDateChange?.(date);
        }
        setSelectingEnd(false);
      } else {
        // normal start date selection
        setSelected(date);
        if (includeTime) setTimeInput(formatTime(date));
        onChange?.(date);
      }
    },
    [onChange, includeTime, endDate, selected, selectingEnd, onEndDateChange],
  );

  const handleTimeBlur = () => {
    const parsed = parseTime(timeInput);
    if (parsed && selected) {
      const newDate = new Date(selected);
      newDate.setHours(parsed.hours, parsed.minutes, 0, 0);
      setTimeInput(formatTime(newDate));
      onChange?.(newDate);
    } else if (selected) {
      setTimeInput(formatTime(selected));
    }
  };
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  return (
    <div className="cv">
      <div className="cv-input">
        <span>
          {selected
            ? includeTime
              ? formatDate(selected) + " " + timeInput
              : formatDate(selected)
            : "No date selected"}
        </span>
      </div>
      {selectingEnd && <div className="cv-hint">Click to select end date</div>}

      <CalendarHeader
        anchor={anchor}
        onPrev={() =>
          setAnchor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
        }
        onNext={() =>
          setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
        }
        onToday={() => {
          setAnchor(today);
          handleSelect(today);
        }}
      />

      <CalendarGrid
        anchor={anchor}
        selected={selected}
        endDate={endDate ?? (selectingEnd ? hoverDate : null)}
        isSelectingEndDate={selectingEnd}
        minDate={minDate}
        maxDate={maxDate}
        onSelect={handleSelect}
        onHover={selectingEnd ? setHoverDate : undefined}
      />

      {includeTime && (
        <CalendarTimeInput
          value={timeInput}
          onChange={setTimeInput}
          onBlur={handleTimeBlur}
        />
      )}

      <CalendarOptions
        endDate={endDate}
        onEndDateToggle={(enabled) => {
          if (!enabled) {
            onEndDateChange?.(null);
            setSelectingEnd(false);
          } else {
            onEndDateChange?.(new Date());
          }
        }}
        dateFormat={dateFormat}
        onDateFormatChange={onDateFormatChange}
        includeTime={includeTime}
        onIncludeTimeChange={onIncludeTimeChange}
        remind={remind}
        onRemindChange={onRemindChange}
        onClear={() => setSelected(undefined)}
      />
    </div>
  );
}

export default CalendarView;
