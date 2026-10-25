import { useEffect, useState } from "react";
import { useBrowserTab, type BrowserTabIcon } from "./use-browser-tab";
import { useActivePageState } from "../../pages/context/active-page-context";
import { resolveIconName } from "../../pages/cover/icon-name";

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

// Page icons are Material Symbols glyphs (see DynamicIcon). Draw the same
// glyph from the icon font onto a canvas and use it as a PNG data-URL, so the
// tab shows the icon the page shows. A canvas can't set the font's fill axis,
// so the tab draws the glyph's outlined form.
const ICON_FONT = '"Material Symbols Outlined"';
const FAVICON_SIZE = 64;

async function materialIconToFaviconHref(
  name: string,
  color: string,
): Promise<string | null> {
  const glyph = resolveIconName(name);
  try {
    await document.fonts.load(`${FAVICON_SIZE}px ${ICON_FONT}`, glyph);
  } catch {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = FAVICON_SIZE;
  canvas.height = FAVICON_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.font = `${FAVICON_SIZE}px ${ICON_FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  // The glyphs sit on the baseline and fill the em square above it.
  ctx.fillText(glyph, FAVICON_SIZE / 2, FAVICON_SIZE);
  return canvas.toDataURL("image/png");
}

/**
 * Mount once, high in the tree (the page view that wraps the editor), so it
 * re-runs when the active page changes. Drives the browser tab title + favicon,
 * branching on cover.target exactly like PageItemIcon.
 *
 * With `providedTitle` (a view that isn't a page: inbox, trash, chat…) the tab
 * shows that title and the default Folio icon.
 */
export function usePageBrowserTab(
  appName: string | null = "Folio",
  providedTitle?: string,
) {
  const { activePage } = useActivePageState();
  const isPage = providedTitle === undefined;
  const cover = isPage ? activePage?.cover : undefined;
  const title = providedTitle ?? activePage?.title;

  const target = cover?.target ?? null;
  const iconName = cover?.iconName ?? null;
  const color = cover?.color ?? null;

  // Only the "Icons" case is async; we store the resolved favicon keyed by the
  // icon name and colour so a stale result is ignored once the page changes.
  // setState happens ONLY inside the async callback — never synchronously in
  // the effect.
  const [resolved, setResolved] = useState<{
    key: string;
    href: string;
  } | null>(null);
  const iconKey = `${iconName ?? ""}|${color ?? ""}`;

  useEffect(() => {
    if (target !== "Icons" || !iconName) return;

    const resolvedColor = resolveColor(color);

    let cancelled = false;
    materialIconToFaviconHref(iconName, resolvedColor).then((href) => {
      if (!cancelled && href) setResolved({ key: iconKey, href });
    });
    return () => {
      cancelled = true;
    };
  }, [target, iconName, color, iconKey]);

  // Derived synchronously — no setState needed for emoji / empty cases.
  let icon: BrowserTabIcon = null;
  if (iconName) {
    if (target === "Emoji") {
      icon = { kind: "emoji", value: iconName };
    } else if (target === "Icons" && resolved?.key === iconKey) {
      icon = { kind: "href", value: resolved.href };
    }
  }

  useBrowserTab(title, icon, { appName });
}
