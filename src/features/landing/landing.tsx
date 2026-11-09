import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Maximize2 } from "src/components/icons";
import { useTranslation } from "react-i18next";
import {
  LANDING_COPY,
  type LandingCopy,
  type LandingLang,
} from "./landing-copy";
import { HOME_COPY } from "./landing-home-copy";
import { HomeFooter, HomeHeader, HomeView } from "./landing-home";
import { DownloadView } from "./landing-download";
import {
  Button,
  ButtonGroup,
} from "../../components/tiptap-ui-primitive/button";
import { ShowcasePreview } from "../showcase/showcase-preview";
import {
  SHOWCASES,
  getShowcase,
  showcaseTitle,
  type ShowcaseId,
} from "../showcase/showcases";
import { snippets } from "../showcase/content/snippets";
import {
  LandingEditor,
  type PageCover,
  type PageHeadLabels,
} from "./landing-editor/landing-editor";
import "./landing.scss";
import { ShortcutSheet } from "src/components/tiptap-ui/shortcut-sheet";

// ── Theme ─────────────────────────────────────────────────────────────────
type LandingTheme = "light" | "dark";
const THEME_KEY = "folio-landing-theme";

function initialTheme(): LandingTheme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* storage blocked */
  }
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

// ── Routes: #/ (the page), #/<anything>/<example> (an example) ──────────
// An example opens in the real editor on its own page. Older tour links
// (#/editor/blocks…) still open their example.
function parseExample(hash: string): ShowcaseId | null {
  const e = hash.replace(/^#\/?/, "").split("/")[1];
  return e && e in SHOWCASES ? (e as ShowcaseId) : null;
}

// #/download: the download page.
function isDownloadPage(hash: string): boolean {
  return hash.replace(/^#\/?/, "").split("/")[0] === "download";
}

// ── Emojis and icons ──────────────────────────────────────────────────────
const EXAMPLE_EMOJI: Record<ShowcaseId, string> = {
  "getting-started": "🚀",
  blocks: "🧩",
  databases: "📊",
  collaborate: "🤝",
  "team-wiki": "📚",
  "project-tracker": "✅",
  "meeting-notes": "🗓️",
  course: "🎓",
  buttons: "🔘",
  containers: "📦",
};

/** A cover per example, so every page opens looking like a real one. */
const EXAMPLE_COVER: Partial<Record<ShowcaseId, PageCover>> = {
  "getting-started": {
    kind: "gradient",
    value: "linear-gradient(135deg, #e8d5f5 0%, #c4d8f0 100%)",
  },
  "team-wiki": {
    kind: "gradient",
    value: "linear-gradient(135deg, #5ecfcc 0%, #4ab8d8 100%)",
  },
  "meeting-notes": {
    kind: "gradient",
    value: "linear-gradient(135deg, #fdf3e7 0%, #fdf3e7 100%)",
  },
  course: {
    kind: "gradient",
    value: "linear-gradient(135deg, #f5a623 0%, #f5a623 100%)",
  },
};

const headLabels = (c: LandingCopy): PageHeadLabels => ({
  addIcon: c.editor.addIcon,
  addCover: c.editor.addCover,
  changeCover: c.editor.changeCover,
  removeCover: c.editor.removeCover,
});

/**
 * The public page signed-out visitors see at "/": one long page (header,
 * hero with the real editor, features, desktop, offline, open source,
 * footer: landing-home.tsx), and examples that open in the real editor.
 * French and English (follows i18next), light and dark (follows the system
 * until toggled, remembered per browser).
 */
export function Landing({
  onGetStarted,
  onSignIn,
}: {
  onGetStarted: () => void;
  onSignIn: () => void;
}) {
  const { i18n } = useTranslation();
  const lang: LandingLang = i18n.language?.startsWith("en") ? "en" : "fr";
  const c = LANDING_COPY[lang];
  const home = HOME_COPY[lang];

  const [theme, setTheme] = useState<LandingTheme>(initialTheme);
  const [example, setExample] = useState<ShowcaseId | null>(() =>
    parseExample(typeof window !== "undefined" ? window.location.hash : ""),
  );
  const [downloadPage, setDownloadPage] = useState(() =>
    isDownloadPage(typeof window !== "undefined" ? window.location.hash : ""),
  );
  const mainRef = useRef<HTMLElement | null>(null);

  // Follow the address bar (links, back / forward).
  useEffect(() => {
    const onHash = () => {
      setExample(parseExample(window.location.hash));
      setDownloadPage(isDownloadPage(window.location.hash));
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // An example or the download page opened or closed: back to the top.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [example, downloadPage]);

  // The app's primitives (Button, the editor's nodes) read dark mode from
  // `html.dark`, like the app itself. Once signed in, the app re-applies
  // the workspace theme when it mounts.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => {
    const next: LandingTheme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* storage blocked */
    }
  };

  return (
    <div
      className={`landing${example ? " landing--focus" : ""}`}
      data-theme={theme}
      lang={lang}
    >
      <ShortcutSheet />
      {/* An example in full screen: the editor alone, nothing around it. */}
      {!example && (
        <HomeHeader
          c={home}
          lang={lang}
          onLang={(l) => void i18n.changeLanguage(l)}
          theme={theme}
          onToggleTheme={toggleTheme}
          themeLabel={
            theme === "dark" ? c.header.themeLight : c.header.themeDark
          }
          languageLabel={c.header.language}
          signIn={c.header.signIn}
          cta={c.header.cta}
          onSignIn={onSignIn}
          onGetStarted={onGetStarted}
        />
      )}

      <main ref={mainRef} className="landing-main">
        {example ? (
          <ExampleView
            key={`${example}/${lang}`}
            c={c}
            lang={lang}
            example={example}
            onGetStarted={onGetStarted}
          />
        ) : downloadPage ? (
          <DownloadView lang={lang} onOpenWeb={onGetStarted} />
        ) : (
          <HomeView
            c={home}
            onGetStarted={onGetStarted}
            pages={
              <LiveEditor
                c={c}
                lang={lang}
                examples={["getting-started", "team-wiki", "meeting-notes"]}
              />
            }
            databases={
              <ShowcasePreview
                className="landing-live landing-frame"
                content={snippets.db[lang]}
                ratio="16 / 9"
                pageWidth={900}
                dark={theme === "dark"}
                label={c.sections.databases.heading}
              />
            }
          />
        )}
        {!example && <HomeFooter c={home} />}
      </main>
    </div>
  );
}

// ── The live editor: the real one, nothing saved ──────────────────────────
function LiveEditor({
  c,
  lang,
  examples,
}: {
  c: LandingCopy;
  lang: LandingLang;
  examples: ShowcaseId[];
}) {
  const [current, setCurrent] = useState<ShowcaseId>(examples[0]);
  const [resetToken, setResetToken] = useState(0);
  const content = useMemo(() => getShowcase(current, lang), [current, lang]);
  return (
    <section className="landing-editor">
      <div className="landing-editor__bar">
        <span className="landing-editor__badge">
          <span className="landing-editor__dot" />
          {c.editor.badge}
        </span>
        <span className="landing-editor__hint">{c.editor.hint}</span>
        <span className="landing-editor__spacer" />
        {examples.length > 1 && (
          <ButtonGroup
            orientation="horizontal"
            className="landing-editor__examples"
            aria-label={c.editor.examples}
          >
            {examples.map((e) => (
              <Button
                key={e}
                type="button"
                variant="ghost"
                size="small"
                aria-pressed={current === e}
                data-active-state={current === e ? "on" : "off"}
                onClick={() => setCurrent(e)}
              >
                <span className="tiptap-button-emoji" aria-hidden>
                  {EXAMPLE_EMOJI[e]}
                </span>
                <span className="tiptap-button-text">
                  {showcaseTitle(e, lang).split(" — ")[0]}
                </span>
              </Button>
            ))}
          </ButtonGroup>
        )}
        <Button
          type="button"
          variant="ghost"
          size="small"
          onClick={() => setResetToken((n) => n + 1)}
        >
          <span className="tiptap-button-text">{c.editor.reset}</span>
        </Button>
        <a
          className="landing-editor__full"
          href={`#/editor/${current}`}
          title={c.editor.fullScreen}
        >
          {c.editor.fullScreen}
          <Maximize2 size={14} />
        </a>
      </div>
      <div className="landing-editor__page">
        <LandingEditor
          key={`${current}/${lang}/${resetToken}`}
          content={content}
          labels={headLabels(c)}
          cover={EXAMPLE_COVER[current] ?? null}
          icon={{ name: EXAMPLE_EMOJI[current], target: "Emoji" }}
        />
      </div>
    </section>
  );
}

// ── An example, opened in the real editor ─────────────────────────────────
function ExampleView({
  c,
  lang,
  example,
  onGetStarted,
}: {
  c: LandingCopy;
  lang: LandingLang;
  example: ShowcaseId;
  onGetStarted: () => void;
}) {
  const [resetToken, setResetToken] = useState(0);
  const content = useMemo(() => getShowcase(example, lang), [example, lang]);

  // Escape leaves full screen, when it isn't busy elsewhere: typing in the
  // page (where it closes menus and pickers) or in a menu or dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const busy = (document.activeElement as HTMLElement | null)?.closest(
        '.ProseMirror, [role="menu"], [role="dialog"], [role="listbox"]',
      );
      if (!busy) window.location.hash = "/";
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="landing-example">
      <div className="landing-example__banner" role="note">
        <a href="#/" className="landing-example__back">
          <ArrowLeft size={16} />
          {c.example.back} Folio
        </a>
        <span className="landing-example__badge">{c.example.badge}</span>
        <span className="landing-example__text">{c.example.banner}</span>
        <span className="landing-example__spacer" />
        <Button
          type="button"
          variant="ghost"
          onClick={() => setResetToken((n) => n + 1)}
        >
          <span className="tiptap-button-text">{c.example.reset}</span>
        </Button>
        <Button type="button" variant="primary" onClick={onGetStarted}>
          <span className="tiptap-button-text">{c.example.useTemplate}</span>
        </Button>
      </div>
      <div className="landing-example__page">
        <LandingEditor
          key={resetToken}
          content={content}
          labels={headLabels(c)}
          cover={EXAMPLE_COVER[example] ?? null}
          icon={{ name: EXAMPLE_EMOJI[example], target: "Emoji" }}
        />
      </div>
    </div>
  );
}
