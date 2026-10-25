import { createIcon, type IconProps } from "src/components/icons";

// The sidebar's icons: Home, Inbox, Chats, Search, the default page icon,
// and the top row's chevron, collapse, compose and plus. 16px by default.
//   <SbHomeIcon />
//   <SbPageIcon size={15} />

export type SidebarIconProps = IconProps;

const icon = (name: string, glyph: string) => createIcon(name, glyph, 16);

export const SbHomeIcon = icon("SbHomeIcon", "home");
export const SbInboxIcon = icon("SbInboxIcon", "inbox");
export const SbChatsIcon = icon("SbChatsIcon", "chat");
export const SbSearchIcon = icon("SbSearchIcon", "search");
export const SbPageIcon = icon("SbPageIcon", "description");
export const SbChevronDownIcon = icon("SbChevronDownIcon", "keyboard_arrow_down");
export const SbCollapseIcon = icon("SbCollapseIcon", "keyboard_double_arrow_left");
export const SbExpandIcon = icon("SbExpandIcon", "keyboard_double_arrow_right");
export const SbComposeIcon = icon("SbComposeIcon", "edit_square");
export const SbPlusIcon = icon("SbPlusIcon", "add");
export const SbChevronRightIcon = icon("SbChevronRightIcon", "keyboard_arrow_right");
