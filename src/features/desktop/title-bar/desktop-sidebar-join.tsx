import { useLayoutEffect } from "react";
import {
  useEditorLayoutState,
  useEditorLayoutTransient,
} from "src/features/shell/context/editor-layout-context";
import { useLayoutMode } from "src/features/shell/hooks/use-layout-mode";
import { calculateSidebarWidth } from "src/lib/utils";

// The sidebar and the title bar as one (design B): the docked sidebar runs
// up to the top of the window, its workspace switcher level with the tabs,
// and the title bar starts at its right edge, over the page only. This
// keeps the docked sidebar's width on <html> as --desktop-sidebar-w for the
// CSS (desktop-title-bar.scss); 0 when it's collapsed, floating or on a
// narrow window. Desktop app only, main window (signed-in-app.tsx).

export function DesktopSidebarJoin() {
  const { collapsed } = useEditorLayoutState();
  const { expandedWidth } = useEditorLayoutTransient();
  const { mode } = useLayoutMode();
  const docked = mode !== "mobile" && !collapsed;
  const width = docked
    ? calculateSidebarWidth(mode, collapsed, expandedWidth)
    : 0;

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--desktop-sidebar-w", `${width}px`);
    root.classList.toggle("has-docked-sidebar", docked);
  }, [width, docked]);

  useLayoutEffect(
    () => () => {
      document.documentElement.style.removeProperty("--desktop-sidebar-w");
      document.documentElement.classList.remove("has-docked-sidebar");
    },
    [],
  );

  return null;
}
