import { Plus } from "src/components/icons";
import { useTranslation } from "react-i18next";
import type { DatabaseView } from "src/types";

const DAY = 24 * 60 * 60 * 1000;
// Jan 4 2026 was a Sunday: the week's day names, in the reader's language.
const SUNDAY = new Date(2026, 0, 4);

/**
 * A faded, empty picture of a view, shown while a new database block waits
 * for its data source (data-source-picker). Decoration only: nothing in it
 * is interactive.
 */
export function ViewPlaceholder({ type }: { type: DatabaseView["type"] }) {
  const { t, i18n } = useTranslation();
  const newPage = (
    <span className="db-ph__new">
      <Plus size={16} />
      {t("database.picker.newPage")}
    </span>
  );

  switch (type) {
    case "board":
      return (
        <div className="db-ph db-ph--board">
          {(["gray", "blue", "green"] as const).map((tone, i) => (
            <div key={tone} className="db-ph__column" data-tone={tone}>
              <div className="db-ph__column-head">
                <span className="db-ph__pill">
                  <span className="db-ph__dot" />
                  {t(
                    [
                      "database.picker.notStarted",
                      "database.picker.inProgress",
                      "database.picker.done",
                    ][i],
                  )}
                </span>
                <span className="db-ph__count">0</span>
              </div>
              <span className="db-ph__card-new">{newPage}</span>
            </div>
          ))}
        </div>
      );

    case "table":
      return (
        <div className="db-ph db-ph--table">
          <div className="db-ph__row db-ph__row--head">
            <span className="db-ph__cell">
              <span className="db-ph__aa">Aa</span>
              {t("database.picker.name")}
            </span>
            <span className="db-ph__cell">
              <Plus size={16} />
              {t("database.picker.addProperty")}
            </span>
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="db-ph__row">
              <span className="db-ph__cell">{i === 0 && newPage}</span>
              <span className="db-ph__cell" />
            </div>
          ))}
        </div>
      );

    case "calendar": {
      const today = new Date();
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const daysInMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
      ).getDate();
      const weeks = Math.ceil((first.getDay() + daysInMonth) / 7);
      const start = first.getTime() - first.getDay() * DAY;
      return (
        <div className="db-ph db-ph--calendar">
          <div className="db-ph__month">
            {today.toLocaleDateString(i18n.language, {
              month: "long",
              year: "numeric",
            })}
          </div>
          <div className="db-ph__weekdays">
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i}>
                {new Date(SUNDAY.getTime() + i * DAY).toLocaleDateString(
                  i18n.language,
                  { weekday: "short" },
                )}
              </span>
            ))}
          </div>
          <div className="db-ph__grid">
            {Array.from({ length: weeks * 7 }, (_, i) => {
              const d = new Date(start + i * DAY);
              const inMonth = d.getMonth() === today.getMonth();
              const isToday = d.toDateString() === today.toDateString();
              return (
                <span
                  key={i}
                  className="db-ph__day"
                  data-out={!inMonth || undefined}
                >
                  <span data-today={isToday || undefined}>{d.getDate()}</span>
                </span>
              );
            })}
          </div>
        </div>
      );
    }

    case "timeline": {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const days = Array.from(
        { length: 22 },
        (_, i) => new Date(today.getTime() + (i - 13) * DAY),
      );
      return (
        <div className="db-ph db-ph--timeline">
          <div className="db-ph__month">
            {today.toLocaleDateString(i18n.language, {
              month: "long",
              year: "numeric",
            })}
          </div>
          <div className="db-ph__strip">
            {days.map((d) => {
              const isToday = d.getTime() === today.getTime();
              const weekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <span
                  key={d.getTime()}
                  className="db-ph__tl-day"
                  data-weekend={weekend || undefined}
                >
                  <span data-today={isToday || undefined}>{d.getDate()}</span>
                </span>
              );
            })}
          </div>
          <div className="db-ph__tl-foot">
            <Plus size={16} />
            {t("database.picker.new")}
          </div>
        </div>
      );
    }

    // list, gallery
    default:
      return (
        <div className="db-ph db-ph--list">
          <span className="db-ph__card-new db-ph__card-new--wide">
            {newPage}
          </span>
        </div>
      );
  }
}
