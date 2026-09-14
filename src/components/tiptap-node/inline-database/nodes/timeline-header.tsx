import { memo } from "react";
import type { TimelineRange } from "../hooks/use-timeline-layout";
import {
  DAY_WIDTH,
  HEADER_HEIGHT,
  GROUP_ROW_HEIGHT,
} from "../hooks/use-timeline-layout";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

function TimelineHeaderImpl({ range }: { range: TimelineRange }) {
  const gridWidth = range.days.length * DAY_WIDTH;

  let dayCursor = 0;
  const groupsWithYear = range.headerGroups.map((group) => {
    const groupStart = range.days[dayCursor];
    // eslint-disable-next-line react-hooks/immutability
    dayCursor += group.days;
    return { ...group, year: groupStart?.getFullYear() };
  });

  return (
    <div
      className="db-tl-header"
      style={{
        width: gridWidth,
        minWidth: gridWidth,
        height: HEADER_HEIGHT + GROUP_ROW_HEIGHT,
      }}
    >
      <div
        className="db-tl-header__groups"
        style={{ height: GROUP_ROW_HEIGHT }}
      >
        {groupsWithYear.map((group, i) => (
          <div
            key={`${group.label}-${i}`}
            className="db-tl-header__group"
            style={{ width: group.days * DAY_WIDTH }}
          >
            <Button
              variant="ghost"
              className=" db-tl-header__group-label"
              style={{ background: "transparent" }}
            >
              <span className="tiptap-button-text">
                {group.label}
                {group.year != null ? ` ${group.year}` : ""}
              </span>
            </Button>
          </div>
        ))}
      </div>
      <Spacer orientation="vertical" size={5} />
      <div className="db-tl-header__days" style={{ height: HEADER_HEIGHT }}>
        {range.days.map((day, i) => (
          <div
            key={i}
            className="db-tl-header__day"
            style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }}
          >
            {day.getDate()}
          </div>
        ))}
      </div>
    </div>
  );
}

export const TimelineHeader = memo(TimelineHeaderImpl);
