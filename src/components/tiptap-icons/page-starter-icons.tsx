import { createIcon } from "src/components/icons";

// The new-page starter's icons (template, database views, the row chevron).
// 16px by default.

const icon = (name: string, glyph: string) => createIcon(name, glyph, 16);

export const PsTemplateIcon = icon("PsTemplateIcon", "dashboard_customize");
export const PsTableIcon = icon("PsTableIcon", "table");
export const PsBoardIcon = icon("PsBoardIcon", "view_kanban");
export const PsListIcon = icon("PsListIcon", "view_list");
export const PsGalleryIcon = icon("PsGalleryIcon", "gallery_thumbnail");
export const PsCalendarIcon = icon("PsCalendarIcon", "calendar_month");
export const PsTimelineIcon = icon("PsTimelineIcon", "view_timeline");
export const PsChevronRightIcon = icon("PsChevronRightIcon", "keyboard_arrow_right");
