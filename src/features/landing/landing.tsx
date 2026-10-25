import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  AtSign,
  BookOpen,
  Box,
  Building2,
  ChevronRight,
  Code2,
  Columns3,
  Database,
  Hash,
  Image as ImageIcon,
  LayoutTemplate,
  List,
  ListChecks,
  MessageSquareText,
  Moon,
  MousePointer2,
  PanelsTopLeft,
  PenLine,
  Quote,
  Sigma,
  Sun,
  Table2,
  Users,
  Video,
  WifiOff,
  type LucideIcon,
} from "src/components/icons";
import {
  LANDING_COPY,
  TOUR,
  type LandingCopy,
  type LandingLang,
  type NavId,
  type SectionId,
  type SectionVisual,
  type ShotId,
} from "./landing-copy";
import { LANDING_SHOTS } from "./landing-shots";
import { FolioMark } from "../../components/brand/folio-mark";
import {
  Button,
  ButtonGroup,
} from "../../components/tiptap-ui-primitive/button";
import { Card, CardBody } from "src/components/tiptap-ui-primitive/card";
import { FileText } from "src/components/tiptap-icons";
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
import { CollabDemo, type CollabPerson } from "./landing-editor/collab-demo";
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

// ── Routes: #/ (overview), #/page, #/page/example ─────────────────────────
type PageId = NavId | "overview";
interface Route {
  page: PageId;
  example: ShowcaseId | null;
}

const NAV_IDS = TOUR.nav.map((n) => n.id);

function parseHash(hash: string): Route {
  const [p, e] = hash.replace(/^#\/?/, "").split("/");
  const page = (NAV_IDS as string[]).includes(p) ? (p as NavId) : "overview";
  const example = e && e in SHOWCASES ? (e as ShowcaseId) : null;
  return { page, example };
}

const pageHref = (p: PageId) => (p === "overview" ? "#/" : `#/${p}`);
const exampleHref = (p: PageId, e: ShowcaseId) =>
  `#/${p === "overview" ? "editor" : p}/${e}`;

/** The nav page a feature section lives on. */
const navOf = (s: Exclude<SectionId, "overview">): NavId =>
  TOUR.nav.find((n) => n.sections.includes(s))?.id ?? "editor";

// Buttons (not links) move between pages by setting the hash; the
// hashchange listener does the rest.
const go = (href: string) => {
  window.location.hash = href.replace(/^#/, "");
};

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

const SECTION_ICONS: Record<Exclude<SectionId, "overview">, LucideIcon> = {
  editor: PenLine,
  blocks: Box,
  covers: ImageIcon,
  templates: LayoutTemplate,
  workspaces: Building2,
  teamspaces: Users,
  databases: Database,
  collaboration: MousePointer2,
  comments: MessageSquareText,
  rooms: Hash,
  offline: WifiOff,
};

// One icon per block group item, in LANDING_COPY.blockGroups order.
const BLOCK_ICONS: LucideIcon[][] = [
  [FileText, ListChecks, ChevronRight, MessageSquareText, Quote, AtSign],
  [Columns3, PanelsTopLeft, Table2, List, FileText, Database],
  [ImageIcon, FileText, Video, Video, BookOpen],
  [Code2, Code2, Sigma, ArrowRight, Box],
];

const COLLAB_PEOPLE: [CollabPerson, CollabPerson] = [
  { name: "Awa", color: "#6229ff" },
  { name: "Moussa", color: "#e8504a" },
];

const headLabels = (c: LandingCopy): PageHeadLabels => ({
  addIcon: c.editor.addIcon,
  addCover: c.editor.addCover,
  changeCover: c.editor.changeCover,
  removeCover: c.editor.removeCover,
});

/**
 * The public page signed-out visitors see at "/": a product tour with a
 * top nav (Editor, Organize, Teamspaces, Together, Offline). The editor on
 * it is the real page editor, with its menus, a cover and an icon picker;
 * the Together page runs two editors live on one document. French and
 * English (follows i18next), light and dark (follows the system until
 * toggled, remembered per browser).
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

  const [theme, setTheme] = useState<LandingTheme>(initialTheme);
  const [route, setRoute] = useState<Route>(() =>
    parseHash(typeof window !== "undefined" ? window.location.hash : ""),
  );
  const mainRef = useRef<HTMLElement | null>(null);

  // Follow the address bar (links, back / forward).
  useEffect(() => {
    const onHash = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // New page: back to the top.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [route.page, route.example]);

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
    <div className="landing" data-theme={theme} lang={lang}>
      <ShortcutSheet />
      <header className="landing-header">
        <a href="#/" className="landing-logo">
          <FolioMark size={24} title="" />
          Folio
        </a>

        <nav className="landing-nav" aria-label={c.header.tour}>
          <ButtonGroup orientation="horizontal" className="landing-nav__group">
            {TOUR.nav.map((n) => (
              <Button
                key={n.id}
                type="button"
                variant="ghost"
                aria-current={route.page === n.id ? "page" : undefined}
                data-active-state={route.page === n.id ? "on" : "off"}
                onClick={() => go(pageHref(n.id))}
              >
                <span className="tiptap-button-text">{c.nav[n.id]}</span>
              </Button>
            ))}
          </ButtonGroup>
        </nav>

        <div className="landing-header__spacer" />

        <ButtonGroup
          orientation="horizontal"
          className="landing-lang"
          aria-label={c.header.language}
        >
          {(["fr", "en"] as const).map((l) => (
            <Button
              key={l}
              type="button"
              variant="ghost"
              size="small"
              aria-pressed={lang === l}
              data-active-state={lang === l ? "on" : "off"}
              onClick={() => void i18n.changeLanguage(l)}
            >
              <span className="tiptap-button-text">{l.toUpperCase()}</span>
            </Button>
          ))}
        </ButtonGroup>
        <Button
          type="button"
          variant="ghost"
          size="large"
          onClick={toggleTheme}
          aria-label={
            theme === "dark" ? c.header.themeLight : c.header.themeDark
          }
        >
          {theme === "dark" ? (
            <Sun className="tiptap-button-icon" />
          ) : (
            <Moon className="tiptap-button-icon" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="large"
          className="landing-header__signin"
          onClick={onSignIn}
        >
          <span className="tiptap-button-text">{c.header.signIn}</span>
        </Button>
        <Button
          type="button"
          variant="primary"
          size="large"
          onClick={onGetStarted}
        >
          <span className="tiptap-button-text">{c.header.cta}</span>
        </Button>
      </header>

      <main ref={mainRef} className="landing-main">
        {route.example ? (
          <ExampleView
            key={`${route.page}/${route.example}/${lang}`}
            c={c}
            lang={lang}
            route={route as Route & { example: ShowcaseId }}
            onGetStarted={onGetStarted}
          />
        ) : route.page === "overview" ? (
          <OverviewView
            c={c}
            lang={lang}
            onGetStarted={onGetStarted}
            onSignIn={onSignIn}
          />
        ) : (
          <NavPage c={c} lang={lang} page={route.page} theme={theme} />
        )}
        <footer className="landing-footer">
          <span className="landing-footer__brand">
            <FolioMark size={18} title="" />
            Folio
          </span>
          <span className="landing-muted">{c.footer.tagline}</span>
          <span className="landing-muted">{c.footer.legal}</span>
        </footer>
      </main>
    </div>
  );
}

// ── Overview (design C) ───────────────────────────────────────────────────
// One-column hero (centred pitch, then the real editor stretched across the
// page),
// a bento of what else Folio does (each tile opens its tour page), questions,
// and a gradient call to action.
function OverviewView({
  c,
  lang,
  onGetStarted,
  onSignIn,
}: {
  c: LandingCopy;
  lang: LandingLang;
  onGetStarted: () => void;
  onSignIn: () => void;
}) {
  const o = c.overview;
  return (
    <div className="landing-page landing-page--wide">
      <section className="landing-split">
        <div className="landing-split__text">
          <span className="landing-pill">{o.eyebrow}</span>
          <h1 className="landing-display">
            {o.title1}
            <br />
            {o.title2}
            <span className="landing-display__accent">{o.titleAccent}</span>.
          </h1>
          <p className="landing-lead">{o.lead}</p>
          <div className="landing-actions">
            <Button
              type="button"
              variant="primary"
              size="large"
              className="landing-cta"
              onClick={onGetStarted}
            >
              <span className="tiptap-button-text">{c.hero.primary}</span>
            </Button>
            <Button
              type="button"
              size="large"
              className="landing-cta"
              onClick={() => go(pageHref("editor"))}
            >
              <span className="tiptap-button-text">{c.hero.secondary}</span>
            </Button>
          </div>
          <span className="landing-split__hint">{o.hint}</span>
        </div>
        <div className="landing-split__visual">
          <LiveEditor c={c} lang={lang} examples={TOUR.tries.overview ?? []} />
        </div>
      </section>

      <section className="landing-block">
        <h2 className="landing-h2 landing-h2--big">{o.bentoTitle}</h2>
        <div className="landing-bento">
          <BentoTile c={c} section="databases" wide>
            <span className="landing-bento__chips">
              {c.views.map((v) => (
                <span key={v} className="landing-bento__chip">
                  {v}
                </span>
              ))}
            </span>
          </BentoTile>
          <BentoTile c={c} section="offline">
            <span className="landing-bento__chips">
              {c.offlineSteps.map((st) => (
                <span
                  key={st.pill}
                  className={`landing-bento__state landing-bento__state--${st.tone}`}
                >
                  {st.pill}
                </span>
              ))}
            </span>
          </BentoTile>
          <BentoTile c={c} section="teamspaces" />
          <BentoTile c={c} section="comments" />
          <BentoTile c={c} section="rooms" />
          <BentoTile c={c} section="templates" full tinted />
        </div>
      </section>

      <section className="landing-faq">
        <h2 className="landing-h2 landing-h2--big">{o.faqTitle}</h2>
        <div className="landing-faq__list">
          {o.faq.map((f, i) => (
            <details key={f.q} className="landing-faq__item" open={i === 0}>
              <summary>
                {f.q}
                <ChevronRight size={18} className="landing-faq__chevron" />
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="landing-cta-band">
        <Grain />
        <h2>{c.final.title}</h2>
        <p>{c.final.sub}</p>
        <div className="landing-actions">
          <Button
            type="button"
            size="large"
            className="landing-cta landing-cta--light"
            onClick={onGetStarted}
          >
            <span className="tiptap-button-text">{c.final.primary}</span>
          </Button>
          <Button
            type="button"
            size="large"
            className="landing-cta landing-cta--outline"
            onClick={onSignIn}
          >
            <span className="tiptap-button-text">{c.final.secondary}</span>
          </Button>
        </div>
      </section>
    </div>
  );
}

// One bento tile: the section's icon, name and one-liner; opens its tour page.
function BentoTile({
  c,
  section,
  wide = false,
  full = false,
  tinted = false,
  children,
}: {
  c: LandingCopy;
  section: Exclude<SectionId, "overview">;
  wide?: boolean;
  full?: boolean;
  tinted?: boolean;
  children?: ReactNode;
}) {
  const Icon = SECTION_ICONS[section];
  const cls = [
    "landing-bento__tile",
    wide && "landing-bento__tile--wide",
    full && "landing-bento__tile--full",
    tinted && "landing-bento__tile--tinted",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <a href={pageHref(navOf(section))} className={cls}>
      <span className="landing-bento__icon">
        <Icon size={18} />
      </span>
      <span className="landing-bento__title">{c.sections[section].label}</span>
      <span className="landing-bento__body">{c.sections[section].blurb}</span>
      {children}
      <ArrowRight size={16} className="landing-bento__arrow" />
    </a>
  );
}

// Fine grain over a gradient (an SVG noise filter, no image file).
function Grain() {
  const id = useId();
  return (
    <svg className="landing-grain" aria-hidden width="100%" height="100%">
      <filter id={id}>
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.85"
          numOctaves={3}
          stitchTiles="stitch"
        />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>
  );
}

// ── A nav page: its feature sections, one after another ───────────────────
function NavPage({
  c,
  lang,
  page,
  theme,
}: {
  c: LandingCopy;
  lang: LandingLang;
  page: NavId;
  theme: LandingTheme;
}) {
  const nav = TOUR.nav.find((n) => n.id === page)!;
  return (
    <div className="landing-page">
      {nav.sections.map((section, i) => {
        const s = c.sections[section];
        return (
          <section key={section} className="landing-section" id={section}>
            <header className="landing-page__head">
              {i === 0 && <span className="landing-crumb">{c.nav[page]}</span>}
              {i === 0 ? (
                <h1 className="landing-h1">{s.heading}</h1>
              ) : (
                <h2 className="landing-h1 landing-h1--sub">{s.heading}</h2>
              )}
              <p className="landing-lead">{s.lead}</p>
            </header>

            <Visual
              c={c}
              lang={lang}
              visual={TOUR.visuals[section]}
              theme={theme}
            />

            {s.points && (
              <div className="landing-grid landing-grid--3">
                {s.points.map((p) => (
                  <div key={p.title} className="landing-point">
                    <span className="landing-card__title">{p.title}</span>
                    <span className="landing-muted">{p.body}</span>
                  </div>
                ))}
              </div>
            )}

            <TryLinks
              c={c}
              lang={lang}
              page={page}
              examples={TOUR.tries[section]}
            />
          </section>
        );
      })}
      <NextLink c={c} page={page} />
    </div>
  );
}

function Visual({
  c,
  lang,
  visual,
  theme,
}: {
  c: LandingCopy;
  lang: LandingLang;
  visual: SectionVisual;
  theme: LandingTheme;
}) {
  switch (visual.kind) {
    case "editor":
      return <LiveEditor c={c} lang={lang} examples={visual.examples} />;
    case "collab":
      return (
        <div className="landing-stack">
          <p className="landing-muted landing-hint">{c.collab.hint}</p>
          <CollabDemo
            key={lang}
            content={getShowcase(visual.example, lang)}
            people={COLLAB_PEOPLE}
            windowLabel={c.collab.window}
          />
        </div>
      );
    case "shot":
      return (
        <Shot
          id={visual.shot}
          label={c.shot[visual.shot]}
          ratio={visual.ratio}
        />
      );
    case "blocks":
      return (
        <div className="landing-grid landing-grid--4 landing-blocks">
          {c.blockGroups.map((grp, gi) => (
            <section key={grp.title} className="landing-blocks__group">
              <h3 className="landing-eyebrow">{grp.title}</h3>
              {grp.items.map((it, ii) => {
                const Icon = BLOCK_ICONS[gi]?.[ii] ?? Box;
                return (
                  <div key={it.name} className="landing-blocks__item">
                    <span className="landing-card__icon">
                      <Icon size={17} />
                    </span>
                    <span>
                      <span className="landing-blocks__name">{it.name}</span>
                      <span className="landing-muted landing-blocks__body">
                        {it.body}
                      </span>
                    </span>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      );
    case "templates":
      return (
        <div className="landing-grid landing-grid--2">
          {(TOUR.tries.templates ?? []).map((id) => (
            <a
              key={id}
              href={exampleHref("organize", id)}
              className="landing-card-link"
            >
              <Card className="landing-card landing-card--flush">
                <ShowcasePreview
                  className="landing-live"
                  content={getShowcase(id, lang)}
                  ratio="16 / 9"
                  pageWidth={760}
                  dark={theme === "dark"}
                  label={showcaseTitle(id, lang)}
                />
                <CardBody className="landing-card__content">
                  <span className="landing-card__title">
                    {showcaseTitle(id, lang)}
                  </span>
                  <span className="landing-muted">{c.tryMeta[id]}</span>
                  <span className="landing-text-link">
                    {c.templatesUse} <ArrowRight size={14} />
                  </span>
                </CardBody>
              </Card>
            </a>
          ))}
        </div>
      );
    case "databases":
      return (
        <div className="landing-stack">
          <div className="landing-chips" role="list">
            {c.views.map((v) => (
              <span key={v} role="listitem" className="landing-chip">
                {v}
              </span>
            ))}
          </div>
          <ShowcasePreview
            className="landing-live landing-frame"
            content={snippets.db[lang]}
            ratio="16 / 7"
            pageWidth={900}
            dark={theme === "dark"}
            label={c.sections.databases.heading}
          />
        </div>
      );
    case "offline":
      return (
        <div className="landing-steps">
          {c.offlineSteps.map((st) => (
            <div key={st.pill} className="landing-step">
              <span className={`landing-pill landing-pill--${st.tone}`}>
                {st.pill}
              </span>
              <span>{st.text}</span>
            </div>
          ))}
        </div>
      );
  }
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

// ── "Try it yourself" ─────────────────────────────────────────────────────
function TryLinks({
  c,
  lang,
  page,
  examples,
}: {
  c: LandingCopy;
  lang: LandingLang;
  page: PageId;
  examples?: ShowcaseId[];
}) {
  if (!examples?.length) return null;
  return (
    <section className="landing-try" aria-label={c.tryTitle}>
      <h3 className="landing-eyebrow">{c.tryTitle}</h3>
      <div className="landing-grid landing-grid--3">
        {examples.map((e) => (
          <a key={e} href={exampleHref(page, e)} className="landing-card-link">
            <Card className="landing-card landing-try__card">
              <CardBody className="landing-try__body">
                <span className="landing-try__emoji" aria-hidden>
                  {EXAMPLE_EMOJI[e]}
                </span>
                <span className="landing-try__text">
                  <span className="landing-try__title">
                    {showcaseTitle(e, lang)}
                  </span>
                  <span className="landing-muted landing-try__meta">
                    {c.tryMeta[e]}
                  </span>
                </span>
                <ArrowRight size={16} className="landing-try__arrow" />
              </CardBody>
            </Card>
          </a>
        ))}
      </div>
    </section>
  );
}

function NextLink({ c, page }: { c: LandingCopy; page: NavId }) {
  const next = NAV_IDS[NAV_IDS.indexOf(page) + 1];
  if (!next) return null;
  const first = TOUR.nav.find((n) => n.id === next)!.sections[0];
  return (
    <a href={pageHref(next)} className="landing-next">
      <span className="landing-muted">{c.sections[first].blurb}</span>
      <span className="landing-next__title">
        {c.nav[next]} <ArrowRight size={16} />
      </span>
    </a>
  );
}

// ── An example, opened in the real editor ─────────────────────────────────
function ExampleView({
  c,
  lang,
  route,
  onGetStarted,
}: {
  c: LandingCopy;
  lang: LandingLang;
  route: Route & { example: ShowcaseId };
  onGetStarted: () => void;
}) {
  const [resetToken, setResetToken] = useState(0);
  const content = useMemo(
    () => getShowcase(route.example, lang),
    [route.example, lang],
  );
  return (
    <div className="landing-example">
      <div className="landing-example__banner" role="note">
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
          cover={EXAMPLE_COVER[route.example] ?? null}
          icon={{ name: EXAMPLE_EMOJI[route.example], target: "Emoji" }}
        />
      </div>
      <a
        href={pageHref(route.page)}
        className="landing-next landing-next--back"
      >
        <span className="landing-muted">{c.example.back}</span>
        <span className="landing-next__title">
          {route.page === "overview" ? "Folio" : c.nav[route.page]}
        </span>
      </a>
    </div>
  );
}

// ── Screenshot slot ───────────────────────────────────────────────────────
function Shot({
  id,
  label,
  ratio,
}: {
  id: ShotId;
  label: string;
  ratio: string;
}): ReactNode {
  const src = LANDING_SHOTS[id];
  return (
    <div className="landing-shot landing-frame" style={{ aspectRatio: ratio }}>
      {src ? (
        <img src={src} alt={label.replace(/^[^—]*—\s*/, "")} loading="lazy" />
      ) : (
        <span className="landing-shot__label">{label}</span>
      )}
    </div>
  );
}
