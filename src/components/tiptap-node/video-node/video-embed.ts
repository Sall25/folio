// Turns a pasted link into something the video block can play: an embed for
// YouTube, Vimeo, Loom and Google Drive, or a direct video file. Anything else → null.

export type VideoProvider = "youtube" | "vimeo" | "loom" | "drive" | "file";

export interface VideoSource {
  provider: VideoProvider;
  /** iframe src for providers, the file itself for "file". */
  src: string;
}

const FILE_EXT = /\.(mp4|webm|mov|m4v|ogv|ogg)(?:$|[?#])/i;

function parseUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.trim());
    return url.protocol === "https:" ||
      url.protocol === "http:" ||
      url.protocol === "blob:"
      ? url
      : null;
  } catch {
    return null;
  }
}

// "1m30s", "90s", "90" → seconds
function toSeconds(value: string | null): number {
  if (!value) return 0;
  if (/^\d+$/.test(value)) return Number(value);
  const m = value.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

function youtube(url: URL): VideoSource | null {
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") {
    id = url.pathname.slice(1).split("/")[0];
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]+)/);
      id = m?.[1] ?? null;
    }
  }
  if (!id || !/^[\w-]{6,}$/.test(id)) return null;
  const params = new URLSearchParams({ rel: "0" });
  const start = toSeconds(
    url.searchParams.get("t") ?? url.searchParams.get("start"),
  );
  if (start > 0) params.set("start", String(start));
  return {
    provider: "youtube",
    src: `https://www.youtube-nocookie.com/embed/${id}?${params}`,
  };
}

function vimeo(url: URL): VideoSource | null {
  const host = url.hostname.replace(/^www\./, "");
  if (host !== "vimeo.com" && host !== "player.vimeo.com") return null;
  // vimeo.com/123, vimeo.com/123/abcdef (unlisted hash),
  // vimeo.com/channels/x/123, player.vimeo.com/video/123
  const m = url.pathname.match(/(?:^|\/)(\d{5,})(?:\/([\da-f]+))?/);
  if (!m) return null;
  const hash = m[2] ?? url.searchParams.get("h");
  return {
    provider: "vimeo",
    src: `https://player.vimeo.com/video/${m[1]}${hash ? `?h=${hash}` : ""}`,
  };
}

function loom(url: URL): VideoSource | null {
  const host = url.hostname.replace(/^www\./, "");
  if (host !== "loom.com") return null;
  const m = url.pathname.match(/^\/(?:share|embed)\/([\da-f]{16,})/);
  if (!m) return null;
  return { provider: "loom", src: `https://www.loom.com/embed/${m[1]}` };
}

// drive.google.com/file/d/<id>/view (or /preview, /edit), and the older
// drive.google.com/open?id=<id>. Drive plays it in its own player; the file
// must be shared with "Anyone with the link".
function drive(url: URL): VideoSource | null {
  if (url.hostname !== "drive.google.com") return null;
  const id =
    url.pathname.match(/^\/file\/d\/([\w-]{10,})/)?.[1] ??
    (url.pathname === "/open" ? url.searchParams.get("id") : null);
  if (!id || !/^[\w-]{10,}$/.test(id)) return null;
  return {
    provider: "drive",
    src: `https://drive.google.com/file/d/${id}/preview`,
  };
}

export function parseVideoUrl(raw: string): VideoSource | null {
  const url = parseUrl(raw);
  if (!url) return null;
  if (url.protocol === "blob:") return { provider: "file", src: url.href };
  return (
    youtube(url) ??
    vimeo(url) ??
    loom(url) ??
    drive(url) ??
    (FILE_EXT.test(url.pathname) || FILE_EXT.test(url.href)
      ? { provider: "file", src: url.href }
      : null)
  );
}

/** Where a saved src plays: a provider iframe, or the video element. */
export function videoSourceOf(src: string): VideoSource {
  return parseVideoUrl(src) ?? { provider: "file", src };
}
