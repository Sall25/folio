import { ArrowLeft, ChevronLeft, ChevronRight } from "src/components/icons";
import { useTranslation } from "react-i18next";
import { useDatabaseContext } from "../../context/database-context";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  useCalendarViewActions,
  useCalendarViewState,
} from "../../context/calendar-view-context";
import { memo } from "react";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { ViewStageButton } from "../../components/view-stage";

function CalendarNavImpl({ onOpenStage }: { onOpenStage?: () => void }) {
  const { t } = useTranslation();
  const { db } = useDatabaseContext();
  const { i18n } = useTranslation();
  // Arrived here from a timeline ("Manage in calendar"): the way back,
  // named after the view it leads to. Ephemeral — a reload lands on this
  // calendar as the ordinary view it is, with no chip and nothing owed.
  const cameFrom = db.views.find((v) => v.id === db.managingFromViewId);

  const { prevMonth, nextMonth, goToday } = useCalendarViewActions();
  const { year, month } = useCalendarViewState();
  const monthLabel = new Date(year, month).toLocaleString(
    i18n.resolvedLanguage,
    {
      month: "long",
      year: "numeric",
    },
  );

  return (
    <CardItemGroup orientation="horizontal" className="db-calendar__nav">
      <Button
        size="large"
        className="month-label"
        variant="ghost"
        data-highlighted={true}
      >
        <span className="tiptap-button-text">{monthLabel}</span>
      </Button>
      {cameFrom && (
        <Button
          variant="ghost"
          className="db-calendar__back"
          onClick={() => {
            db.setActiveView(cameFrom.id);
            db.setManagingFrom(null);
          }}
        >
          <ArrowLeft className="tiptap-button-icon" size={14} />
          <span className="tiptap-button-text">
            {t("database.manageInCalendar.back", { name: cameFrom.name })}
          </span>
        </Button>
      )}

      <Spacer orientation="horizontal" />
      <Button
        variant="ghost"
        onClick={prevMonth}
        className="db-calendar__nav-btn"
      >
        <ChevronLeft className="tiptap-button-icon" />
      </Button>
      <Button
        variant="ghost"
        size="large"
        className="db-calendar__month-label"
        data-highlighted={true}
        onClick={goToday}
      >
        <span className="tiptap-button-text">Today</span>
      </Button>
      <Button
        variant="ghost"
        onClick={nextMonth}
        className="db-calendar__nav-btn"
      >
        <ChevronRight className="tiptap-button-icon" />
      </Button>
      {onOpenStage && <ViewStageButton onOpen={onOpenStage} />}
    </CardItemGroup>
  );
}

export const CalendarNav = memo(CalendarNavImpl);
