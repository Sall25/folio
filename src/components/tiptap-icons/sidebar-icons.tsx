import type { SVGProps } from "react";

// Folio's own sidebar glyphs, drawn for the Dense list sidebar (design 13)
// and its quiet top row (design 18): Home, Inbox, Chats, Search, the default
// page icon, and the top row's chevron, collapse and plus. Plain inline SVG on a
// 24×24 grid, round caps and joins, no icon library.
// Sidebar rows use them at 16px with a 1.8 stroke, pages at 15px:
//   <SbHomeIcon />                      → 16px, stroke 1.8
//   <SbPageIcon size={15} />
//   <SbInboxIcon strokeWidth={2} />

export interface SidebarIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

function icon(name: string, children: React.ReactNode) {
  function SidebarIcon({
    size = 16,
    strokeWidth = 1.8,
    ...rest
  }: SidebarIconProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        {...rest}
      >
        {children}
      </svg>
    );
  }
  SidebarIcon.displayName = name;
  return SidebarIcon;
}

// A house: pitched roof and walls in one stroke, a door cut into the floor.
export const SbHomeIcon = icon(
  "SbHomeIcon",
  <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
);

// A tray: slanted sides, a flat floor with a dip where mail lands.
export const SbInboxIcon = icon(
  "SbInboxIcon",
  <>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </>,
);

// A speech bubble with its tail at the bottom left.
export const SbChatsIcon = icon(
  "SbChatsIcon",
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
);

// A magnifier: round lens, short handle to the bottom right.
export const SbSearchIcon = icon(
  "SbSearchIcon",
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </>,
);

// A page with a folded top-right corner (pages without their own icon).
export const SbPageIcon = icon(
  "SbPageIcon",
  <>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </>,
);

// The space switcher's chevron.
export const SbChevronDownIcon = icon(
  "SbChevronDownIcon",
  <path d="m6 9 6 6 6-6" />,
);

// Collapse the sidebar: two chevrons pointing left.
export const SbCollapseIcon = icon(
  "SbCollapseIcon",
  <>
    <path d="m11 17-5-5 5-5" />
    <path d="m18 17-5-5 5-5" />
  </>,
);

// Expand it again: the same, pointing right.
export const SbExpandIcon = icon(
  "SbExpandIcon",
  <>
    <path d="m13 17 5-5-5-5" />
    <path d="m6 17 5-5-5-5" />
  </>,
);

// New page.
export const SbPlusIcon = icon("SbPlusIcon", <path d="M12 5v14M5 12h14" />);
