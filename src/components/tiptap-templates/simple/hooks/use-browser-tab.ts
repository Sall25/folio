import { useEffect } from "react";

// Remember the page's original favicon so we can restore it when a page has none.
let _defaultFavicon: string | null = null;

function getFaviconLink(): HTMLLinkElement | null {
  if (typeof document === "undefined") return null;
  let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  if (_defaultFavicon === null) _defaultFavicon = link.href || "";
  return link;
}

function emojiToDataUrl(emoji: string, size = 64): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.clearRect(0, 0, size, size);
  ctx.font = `${Math.floor(
    size * 0.82,
  )}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, size / 2, Math.floor(size * 0.55));
  return canvas.toDataURL("image/png");
}

function setFaviconHref(href: string | null) {
  const link = getFaviconLink();
  if (!link) return;
  link.href = href || _defaultFavicon || "";
}

// Caller tells us what the icon IS — no sniffing. `href` is an image URL or a
// precomputed data-URL (e.g. a serialized lucide SVG).
export type BrowserTabIcon =
  | { kind: "emoji"; value: string }
  | { kind: "href"; value: string }
  | null;

export interface BrowserTabOptions {
  /** appended as " · {appName}" when set; null/undefined uses the bare title */
  appName?: string | null;
  /** also drive the favicon (default true) */
  favicon?: boolean;
}

/** Drives the OS browser tab's title and favicon from an explicit icon descriptor. */
export function useBrowserTab(
  title: string | null | undefined,
  icon: BrowserTabIcon,
  options: BrowserTabOptions = {},
) {
  const { appName = null, favicon = true } = options;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const t = (title || "").trim() || "Untitled";
    document.title = appName ? `${t} | ${appName}` : t;
  }, [title, appName]);

  const iconKind = icon?.kind ?? null;
  const iconValue = icon?.value ?? null;
  useEffect(() => {
    if (!favicon) return;
    if (!iconKind || !iconValue) {
      setFaviconHref(null);
      return;
    }
    setFaviconHref(
      iconKind === "emoji" ? emojiToDataUrl(iconValue) : iconValue,
    );
  }, [iconKind, iconValue, favicon]);
}
