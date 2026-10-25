import { createIcon, type IconProps } from "src/components/icons";

// The sidebar's older icon set, kept under its names so its call sites
// don't change. 24px by default.
//   <TbHome size={17} />

export type TablerIconProps = IconProps;

export const TbArrowRight = createIcon("TbArrowRight", "arrow_forward");
export const TbBooks = createIcon("TbBooks", "local_library");
export const TbChevronDown = createIcon("TbChevronDown", "keyboard_arrow_down");
export const TbChevronRight = createIcon("TbChevronRight", "keyboard_arrow_right");
export const TbChevronsLeft = createIcon("TbChevronsLeft", "keyboard_double_arrow_left");
export const TbChevronsRight = createIcon("TbChevronsRight", "keyboard_double_arrow_right");
export const TbDots = createIcon("TbDots", "more_horiz");
export const TbEdit = createIcon("TbEdit", "edit_square");
export const TbFileText = createIcon("TbFileText", "description");
export const TbHome = createIcon("TbHome", "home");
export const TbInbox = createIcon("TbInbox", "inbox");
export const TbMessages = createIcon("TbMessages", "forum");
export const TbPin = createIcon("TbPin", "keep");
export const TbPinnedOff = createIcon("TbPinnedOff", "keep_off");
export const TbPlus = createIcon("TbPlus", "add");
export const TbSearch = createIcon("TbSearch", "search");
export const TbSelector = createIcon("TbSelector", "unfold_more");
export const TbTemplate = createIcon("TbTemplate", "space_dashboard");
export const TbTrash = createIcon("TbTrash", "delete");
export const TbX = createIcon("TbX", "close");
