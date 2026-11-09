import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Monitor } from "src/components/icons";
import type { LandingLang } from "./landing-copy";
import { GITHUB_URL, RELEASES_URL } from "./landing-home-copy";
import "./landing-download.scss";

// The landing's download page (#/download). One big button for the
// visitor's computer, every other system below, and what to click the first
// time the app opens. The buttons link straight to the installers of the
// latest GitHub release (asked from GitHub's API when the page opens), so
// the page never needs editing for a new version. Without an answer from
// GitHub, every button opens the releases page instead.

/** The latest release, from GitHub's public API. */
const LATEST_RELEASE_API = `${GITHUB_URL.replace(
  "https://github.com/",
  "https://api.github.com/repos/",
)}/releases/latest`;

type PlatformId =
  | "windows"
  | "mac-arm"
  | "mac-intel"
  | "linux-appimage"
  | "linux-deb"
  | "linux-rpm";

/** Which file of a release each system gets (release.yml's names). */
const ASSET_MATCH: Record<PlatformId, RegExp[]> = {
  windows: [/_x64-setup\.exe$/i, /\.msi$/i],
  "mac-arm": [/_aarch64\.dmg$/i],
  "mac-intel": [/_x64\.dmg$/i],
  "linux-appimage": [/\.AppImage$/i],
  "linux-deb": [/\.deb$/i],
  "linux-rpm": [/\.rpm$/i],
};

const ORDER: PlatformId[] = [
  "mac-arm",
  "mac-intel",
  "windows",
  "linux-appimage",
  "linux-deb",
  "linux-rpm",
];

interface Asset {
  url: string;
  size: number;
}

interface Release {
  version: string;
  assets: Partial<Record<PlatformId, Asset>>;
}

// ── Copy ──────────────────────────────────────────────────────────────────
const COPY = {
  en: {
    back: "Back to Folio",
    title: "Download Folio for your computer",
    lead: "The same workspace as on the web, in its own window: pages open instantly, work offline and update themselves.",
    detected: (os: string) => `We think you're on ${os}`,
    for: (os: string) => `Folio for ${os}`,
    downloadFor: (os: string) => `Download for ${os}`,
    version: (v: string) => `Version ${v}`,
    loading: "Finding the latest version…",
    other: "Not your system?",
    otherLink: "Pick it below",
    orWeb: "or open Folio in the browser",
    otherTitle: "All systems",
    download: "Download",
    phone:
      "Folio's desktop app is for computers. On a phone or a tablet, use Folio in the browser.",
    openWeb: "Open Folio",
    firstLaunch: "First launch",
    help: [
      {
        title: "Windows",
        text: "If you see “Windows protected your PC”, click More info, then Run anyway. It only asks once.",
      },
      {
        title: "macOS",
        text: "If macOS says the app is from an unidentified developer, right-click Folio in Applications, then Open.",
      },
      {
        title: "Updates",
        text: "Folio checks for new versions and offers to install them, from inside the app.",
      },
    ],
    foot: "Folio is free and open source. Every version and its release notes are on",
    platforms: {
      windows: { name: "Windows", detail: "64-bit · installer (.exe)" },
      "mac-arm": {
        name: "macOS · Apple silicon",
        detail: "M1, M2, M3, M4 · .dmg",
      },
      "mac-intel": { name: "macOS · Intel", detail: "Older Macs · .dmg" },
      "linux-appimage": {
        name: "Linux · AppImage",
        detail: "Any distribution",
      },
      "linux-deb": { name: "Linux · .deb", detail: "Ubuntu, Debian, Mint" },
      "linux-rpm": { name: "Linux · .rpm", detail: "Fedora, openSUSE" },
    },
    osName: { windows: "Windows", mac: "macOS", linux: "Linux" },
  },
  fr: {
    back: "Retour à Folio",
    title: "Télécharger Folio pour votre ordinateur",
    lead: "Le même espace que sur le web, dans sa propre fenêtre : les pages s'ouvrent tout de suite, marchent hors ligne et se mettent à jour toutes seules.",
    detected: (os: string) => `Vous semblez être sur ${os}`,
    for: (os: string) => `Folio pour ${os}`,
    downloadFor: (os: string) => `Télécharger pour ${os}`,
    version: (v: string) => `Version ${v}`,
    loading: "Recherche de la dernière version…",
    other: "Ce n'est pas votre système ?",
    otherLink: "Choisissez-le plus bas",
    orWeb: "ou ouvrez Folio dans le navigateur",
    otherTitle: "Tous les systèmes",
    download: "Télécharger",
    phone:
      "L'application de bureau de Folio est faite pour les ordinateurs. Sur un téléphone ou une tablette, utilisez Folio dans le navigateur.",
    openWeb: "Ouvrir Folio",
    firstLaunch: "Premier lancement",
    help: [
      {
        title: "Windows",
        text: "Si « Windows a protégé votre ordinateur » s'affiche, cliquez sur Informations complémentaires, puis Exécuter quand même. Il ne le demande qu'une fois.",
      },
      {
        title: "macOS",
        text: "Si macOS dit que l'app vient d'un développeur non identifié, faites un clic droit sur Folio dans Applications, puis Ouvrir.",
      },
      {
        title: "Mises à jour",
        text: "Folio vérifie les nouvelles versions et propose de les installer, depuis l'app.",
      },
    ],
    foot: "Folio est gratuit et open source. Toutes les versions et leurs notes sont sur",
    platforms: {
      windows: { name: "Windows", detail: "64 bits · installateur (.exe)" },
      "mac-arm": {
        name: "macOS · Apple silicon",
        detail: "M1, M2, M3, M4 · .dmg",
      },
      "mac-intel": { name: "macOS · Intel", detail: "Anciens Mac · .dmg" },
      "linux-appimage": {
        name: "Linux · AppImage",
        detail: "Toutes les distributions",
      },
      "linux-deb": { name: "Linux · .deb", detail: "Ubuntu, Debian, Mint" },
      "linux-rpm": { name: "Linux · .rpm", detail: "Fedora, openSUSE" },
    },
    osName: { windows: "Windows", mac: "macOS", linux: "Linux" },
  },
};

// ── Which computer is this? ───────────────────────────────────────────────
type Detected =
  | { kind: "desktop"; os: "windows" | "mac" | "linux"; platform: PlatformId }
  | { kind: "phone" }
  | { kind: "unknown" };

function detect(): Detected {
  if (typeof navigator === "undefined") return { kind: "unknown" };
  const ua = navigator.userAgent;
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } })
      .userAgentData?.platform ??
    navigator.platform ??
    "";
  const touchMac = /Mac/.test(platform) && navigator.maxTouchPoints > 1; // iPad
  if (/Android|iPhone|iPad|iPod/i.test(ua) || touchMac)
    return { kind: "phone" };
  if (/Win/i.test(platform) || /Windows/i.test(ua))
    return { kind: "desktop", os: "windows", platform: "windows" };
  // Browsers don't say which kind of Mac; most sold since 2020 are Apple
  // silicon, and Intel is one click away below.
  if (/Mac/i.test(platform) || /Mac OS X/i.test(ua))
    return { kind: "desktop", os: "mac", platform: "mac-arm" };
  if (/Linux|X11/i.test(platform) || /Linux/i.test(ua))
    return { kind: "desktop", os: "linux", platform: "linux-appimage" };
  return { kind: "unknown" };
}

/** Chrome and Edge on a Mac can tell Intel from Apple silicon. */
async function macArchitecture(): Promise<"arm" | "x86" | null> {
  const data = (
    navigator as Navigator & {
      userAgentData?: {
        getHighEntropyValues?: (
          h: string[],
        ) => Promise<{ architecture?: string }>;
      };
    }
  ).userAgentData;
  if (!data?.getHighEntropyValues) return null;
  try {
    const { architecture } = await data.getHighEntropyValues(["architecture"]);
    return architecture === "arm"
      ? "arm"
      : architecture === "x86"
        ? "x86"
        : null;
  } catch {
    return null;
  }
}

async function fetchLatestRelease(signal: AbortSignal): Promise<Release> {
  const res = await fetch(LATEST_RELEASE_API, {
    signal,
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
  const data = (await res.json()) as {
    tag_name?: string;
    assets?: { name: string; browser_download_url: string; size: number }[];
  };
  const assets: Release["assets"] = {};
  for (const id of ORDER) {
    for (const re of ASSET_MATCH[id]) {
      const a = data.assets?.find((x) => re.test(x.name));
      if (a) {
        assets[id] = { url: a.browser_download_url, size: a.size };
        break;
      }
    }
  }
  return { version: (data.tag_name ?? "").replace(/^v/, ""), assets };
}

const megabytes = (bytes: number) =>
  `${Math.max(1, Math.round(bytes / 1e6))} MB`;

// ── The page ──────────────────────────────────────────────────────────────
export function DownloadView({
  lang,
  onOpenWeb,
}: {
  lang: LandingLang;
  onOpenWeb: () => void;
}) {
  const c = COPY[lang];
  const [detected, setDetected] = useState<Detected>(detect);
  const [release, setRelease] = useState<Release | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchLatestRelease(ctrl.signal)
      .then(setRelease)
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        console.warn("[download] latest release unavailable", err);
        setFailed(true);
      });
    return () => ctrl.abort();
  }, []);

  // A Mac whose browser says Intel gets the Intel build.
  useEffect(() => {
    if (detected.kind !== "desktop" || detected.os !== "mac") return;
    let alive = true;
    void macArchitecture().then((arch) => {
      if (alive && arch === "x86")
        setDetected({ kind: "desktop", os: "mac", platform: "mac-intel" });
    });
    return () => {
      alive = false;
    };
  }, [detected]);

  const hrefFor = useMemo(
    () => (id: PlatformId) => release?.assets[id]?.url ?? RELEASES_URL,
    [release],
  );

  const main = detected.kind === "desktop" ? detected : null;
  const mainAsset = main ? release?.assets[main.platform] : undefined;
  const osLabel = main ? c.osName[main.os] : "";

  return (
    <div className="ld">
      <a className="ld-back" href="#/">
        <ArrowLeft size={16} />
        {c.back}
      </a>

      <header className="ld-head">
        <h1 className="ld-title">{c.title}</h1>
        <p className="ld-lead">{c.lead}</p>
      </header>

      {detected.kind === "phone" ? (
        <section className="ld-hero">
          <div className="ld-hero__text">
            <p className="ld-lead">{c.phone}</p>
            <button type="button" className="lh-cta ld-cta" onClick={onOpenWeb}>
              {c.openWeb}
            </button>
          </div>
        </section>
      ) : main ? (
        <section className="ld-hero">
          <div className="ld-hero__text">
            <span className="ld-detected">
              <span className="ld-detected__dot" aria-hidden="true" />
              {c.detected(osLabel)}
            </span>
            <h2 className="ld-hero__title">
              {c.for(c.platforms[main.platform].name)}
            </h2>
            <span className="ld-meta">
              {release
                ? [
                    release.version && c.version(release.version),
                    c.platforms[main.platform].detail,
                    mainAsset && megabytes(mainAsset.size),
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : failed
                  ? c.platforms[main.platform].detail
                  : c.loading}
            </span>
            <a className="lh-cta ld-cta" href={hrefFor(main.platform)}>
              <Download size={18} />
              {c.downloadFor(osLabel)}
            </a>
            <span className="ld-alt">
              {c.other} <a href="#ld-all">{c.otherLink}</a> ·{" "}
              <button type="button" onClick={onOpenWeb}>
                {c.orWeb}
              </button>
            </span>
          </div>
          <div className="ld-hero__art" aria-hidden="true">
            <Monitor size={96} />
          </div>
        </section>
      ) : null}

      <section id="ld-all">
        <h3 className="ld-h3">{c.otherTitle}</h3>
        <div className="ld-grid">
          {ORDER.map((id) => {
            const asset = release?.assets[id];
            return (
              <div key={id} className="ld-plat">
                <div className="ld-plat__text">
                  <b>{c.platforms[id].name}</b>
                  <small>
                    {c.platforms[id].detail}
                    {asset ? ` · ${megabytes(asset.size)}` : ""}
                  </small>
                </div>
                <a className="ld-plat__btn" href={hrefFor(id)}>
                  {c.download}
                </a>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="ld-h3">{c.firstLaunch}</h3>
        <div className="ld-help">
          {c.help.map((h) => (
            <div key={h.title} className="ld-help__item">
              <b>{h.title}</b>
              {h.text}
            </div>
          ))}
        </div>
      </section>

      <p className="ld-foot">
        {c.foot}{" "}
        <a href={`${GITHUB_URL}/releases`} target="_blank" rel="noreferrer">
          GitHub
        </a>
        .
      </p>
    </div>
  );
}
