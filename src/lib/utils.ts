import {
  PADDING_LEFT,
  type LayoutMode,
} from "src/components/tiptap-templates/simple/context/editor-layout-context";

export const SIDEBAR_COLLAPSED_WIDTH = 0;
export const SIDEBAR_DEFAULT_WIDTH = 290;
export const SIDEBAR_MIN_WIDTH = 220;
export const SIDEBAR_MAX_WIDTH = 480;
export const SIDEBAR_WIDTH_KEY = "editor-sidebar-width";

// The drawer's on-screen width on mobile — near full-bleed but leaving a sliver
// of the backdrop so it reads as an overlay, not a page.
export const SIDEBAR_MOBILE_WIDTH = 300;

export const calculateSidebarWidth = (
  mode: LayoutMode,
  collapsed: boolean,
  expandedWidth: number,
) =>
  mode === "mobile"
    ? SIDEBAR_COLLAPSED_WIDTH
    : collapsed
      ? SIDEBAR_COLLAPSED_WIDTH
      : expandedWidth;

export const calculateDrawerWidth = (
  mode: LayoutMode,
  expandedWidth: number,
) => (mode === "mobile" ? SIDEBAR_MOBILE_WIDTH : expandedWidth);

export const calculatePaddingLeft = (collapsed: boolean) =>
  collapsed ? 100 : PADDING_LEFT;
