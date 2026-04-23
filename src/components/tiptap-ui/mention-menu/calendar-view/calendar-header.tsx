import { MONTHS_FULL } from "./utils";
interface CalendarHeaderProps {
  anchor: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function CalendarHeader({
  anchor,
  onPrev,
  onNext,
  onToday,
}: CalendarHeaderProps) {
  return (
    <div className="cv-header">
      <span className="cv-header__label">
        {MONTHS_FULL[anchor.getMonth()]} {anchor.getFullYear()}
      </span>
      <div className="cv-header__right">
        <button className="cv-today-btn" onClick={onToday}>
          Today
        </button>
        <button className="cv-nav__btn" onClick={onPrev} aria-label="Previous">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M9 2L4 7L9 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button className="cv-nav__btn" onClick={onNext} aria-label="Next">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M5 2L10 7L5 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
