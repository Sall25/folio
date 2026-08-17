import { useEffect, useState } from "react";
import { useBrowserTab, type BrowserTabIcon } from "./use-browser-tab";
import { useActivePageState } from "../context/active-page-context";

function resolveColor(raw: string | null): string {
  const FALLBACK = "#5b5b5b";
  if (!raw) return FALLBACK;

  // Concrete color already (hex/rgb/hsl) — use as-is.
  if (!raw.startsWith("var(")) return raw;

  // CSS var → resolve to a real value via the computed style.
  // Extract the custom-property name from `var(--x, fallback)`.
  const propName = raw
    .slice(4, raw.indexOf(",") === -1 ? raw.lastIndexOf(")") : raw.indexOf(","))
    .trim();
  const resolved = getComputedStyle(document.documentElement)
    .getPropertyValue(propName)
    .trim();
  return resolved || FALLBACK;
}

// Draw the Material Symbols glyph to a canvas and export it as a favicon
// data-URL. The font renders the ligature as a glyph, so we paint text, not SVG.
async function materialIconToFaviconHref(
  name: string,
  color: string,
  size = 64,
): Promise<string | null> {
  if (typeof document === "undefined") return null;

  // The font must be loaded before we paint, or canvas draws tofu/nothing.
  try {
    await document.fonts.load(`${size}px "Material Symbols Rounded"`);
    await document.fonts.ready;
  } catch {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.font = `${size}px "Material Symbols Rounded"`;
  ctx.fillStyle = color;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name, size / 2, size / 2);

  return canvas.toDataURL("image/png");
}

/**
 * Mount once, high in the tree (the page view that wraps the editor), so it
 * re-runs when the active page changes. Drives the browser tab title + favicon,
 * branching on cover.target exactly like PageItemIcon.
 */
export function usePageBrowserTab(appName: string | null = "Folio") {
  const { activePage } = useActivePageState();
  const cover = activePage?.cover;
  const title = activePage?.title;

  const target = cover?.target ?? null;
  const iconName = cover?.iconName ?? null;
  const color = cover?.color ?? null;

  // Only the "Icons" case is async; we store the resolved favicon keyed by the
  // icon name so a stale result is ignored once the page changes. setState
  // happens ONLY inside the async callback — never synchronously in the effect.
  const [resolved, setResolved] = useState<{
    name: string;
    href: string;
  } | null>(null);

  useEffect(() => {
    if (target !== "Icons" || !iconName) return;

    const resolvedColor = resolveColor(color);

    let cancelled = false;
    materialIconToFaviconHref(iconName, resolvedColor).then((href) => {
      if (!cancelled && href) setResolved({ name: iconName, href });
    });
    return () => {
      cancelled = true;
    };
  }, [target, iconName, color]);

  // Derived synchronously — no setState needed for emoji / empty cases.
  let icon: BrowserTabIcon = null;
  if (iconName) {
    if (target === "Emoji") {
      icon = { kind: "emoji", value: iconName };
    } else if (target === "Icons" && resolved?.name === iconName) {
      icon = { kind: "href", value: resolved.href };
    }
  }

  useBrowserTab(title, icon, { appName });
}
