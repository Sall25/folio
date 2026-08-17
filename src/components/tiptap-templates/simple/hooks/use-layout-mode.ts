import { useMediaQuery } from "src/hooks/use-breakpoint";
import type { LayoutMode } from "../context/editor-layout-context";

export function useLayoutMode() {
  // Breakpoints: <768 mobile, 768–1024 tablet, >=1024 desktop.
  const isMobile = useMediaQuery("max", "md");
  // const isTabletUp = useMediaQuery("min", "md");
  const isDesktop = useMediaQuery("min", "lg");
  const mode: LayoutMode = isMobile
    ? "mobile"
    : isDesktop
      ? "desktop"
      : "tablet";
  return { mode, isMobile, isDesktop };
}
