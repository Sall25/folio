import { createElement, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { useBrowserTab, type BrowserTabIcon } from "./use-browser-tab";
import { useActivePage } from "../context/active-page-context";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";

// Render the app's DynamicIcon offscreen and serialize its SVG to a favicon
// data-URL. Reuses the same resolver PageItemIcon uses, so the tab icon matches
// the in-app icon. Handles DynamicIcon loading lazily (observer + fallback).
async function lucideToFaviconHref(
  name: string,
  color: string,
  size = 64,
): Promise<string | null> {
  if (typeof document === "undefined") return null;

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  Object.assign(host.style, {
    position: "fixed",
    left: "-9999px",
    top: "0",
    width: `${size}px`,
    height: `${size}px`,
    pointerEvents: "none",
  });
  document.body.appendChild(host);
  const root = createRoot(host);

  const svg = await new Promise<SVGElement | null>((resolve) => {
    let settled = false;
    const done = (el: SVGElement | null) => {
      if (!settled) {
        settled = true;
        resolve(el);
      }
    };
    const read = () => {
      const el = host.querySelector("svg");
      if (el) {
        done(el as unknown as SVGElement);
        return true;
      }
      return false;
    };

    const obs = new MutationObserver(() => {
      if (read()) obs.disconnect();
    });
    obs.observe(host, { childList: true, subtree: true });

    root.render(
      createElement(DynamicIcon, { name, size, stroke: color, strokeWidth: 2 }),
    );

    requestAnimationFrame(() => {
      if (read()) obs.disconnect();
    });
    setTimeout(() => {
      obs.disconnect();
      done(host.querySelector("svg") as unknown as SVGElement | null);
    }, 1500);
  });

  let href: string | null = null;
  if (svg) {
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    if (!svg.getAttribute("xmlns"))
      svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    href = `data:image/svg+xml;utf8,${encodeURIComponent(
      new XMLSerializer().serializeToString(svg),
    )}`;
  }

  root.unmount();
  host.remove();
  return href;
}

/**
 * Mount once, high in the tree (the page view that wraps the editor), so it
 * re-runs when the active page changes. Drives the browser tab title + favicon,
 * branching on cover.target exactly like PageItemIcon.
 */
export function usePageBrowserTab(appName: string | null = "Folio") {
  const { activePage } = useActivePage();
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

    const resolvedColor =
      color && color !== "var(--tt-text-color)" && !color.startsWith("var(")
        ? color
        : "#5b5b5b";

    let cancelled = false;
    lucideToFaviconHref(iconName, resolvedColor).then((href) => {
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
