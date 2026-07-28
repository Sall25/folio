import { useEffect } from "react";
import type { Theme } from "src/types";

const THEME_KEY = "folio-theme";

/** Resolve a Theme to a concrete dark boolean, honoring "system". */
function resolveDark(theme: Theme): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Applies a theme to the document. The EFFECTIVE theme is the per-person
 * override (localStorage) if set, else the workspace default passed in.
 * Listens for OS changes only when the effective theme is "system".
 */
export function useApplyTheme(workspaceDefault: Theme) {
  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY) as Theme | null;
    const effective: Theme = stored ?? workspaceDefault;

    const apply = () =>
      document.documentElement.classList.toggle("dark", resolveDark(effective));
    apply();

    if (effective === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [workspaceDefault]);
}
