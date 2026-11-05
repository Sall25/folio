import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Check,
  Download,
  Menu,
  Moon,
  Star,
  Sun,
  X,
} from "src/components/icons";
import { FolioMark } from "../../components/brand/folio-mark";
import { Button } from "../../components/tiptap-ui-primitive/button";
import { Card, CardBody } from "src/components/tiptap-ui-primitive/card";
import type { LandingLang } from "./landing-copy";
import {
  DISCORD_URL,
  GITHUB_URL,
  RELEASES_URL,
  type HomeCopy,
  type HomeSectionId,
  type HomeShotId,
} from "./landing-home-copy";
import { HOME_SHOTS } from "./landing-shots";
import "./landing-home.scss";

// The landing page: one long page, after Docmost's. The hero holds the
// live editor (Pages), a database (Databases) and a room (Rooms) in one
// window; then features, the desktop app, offline, the small things, open
// source, a call to action and the footer. The header collapses into a
// menu on phones. Screenshots go in landing-shots.ts (HOME_SHOTS); until
// then their slots show a label.

/** Scrolls the page to a section (the page scrolls inside .landing-main,
 *  so plain #anchors would also change the tour's hash routes). */
function scrollToSection(id: HomeSectionId) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

// ── Header ────────────────────────────────────────────────────────────────

export function HomeHeader({
  c,
  lang,
  onLang,
  theme,
  onToggleTheme,
  themeLabel,
  languageLabel,
  signIn,
  cta,
  onSignIn,
  onGetStarted,
}: {
  c: HomeCopy;
  lang: LandingLang;
  onLang: (l: LandingLang) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  themeLabel: string;
  languageLabel: string;
  signIn: string;
  cta: string;
  onSignIn: () => void;
  onGetStarted: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const goTo = (id: HomeSectionId) => {
    setMenuOpen(false);
    scrollToSection(id);
  };

  const langSwitch = (
    <span className="lh-lang" role="group" aria-label={languageLabel}>
      {(["fr", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          className="lh-lang__item"
          aria-pressed={lang === l}
          onClick={() => onLang(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </span>
  );

  const themeButton = (
    <button
      type="button"
      className="lh-icon-btn"
      onClick={onToggleTheme}
      aria-label={themeLabel}
      title={themeLabel}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );

  return (
    <header className={`lh-header${menuOpen ? " is-open" : ""}`}>
      <a href="#/" className="lh-logo" onClick={() => setMenuOpen(false)}>
        <FolioMark size={24} title="" />
        Folio
      </a>

      <nav className="lh-nav" aria-label={c.nav.label}>
        {c.nav.items.map((n) => (
          <button
            key={n.id}
            type="button"
            className="lh-nav__item"
            onClick={() => goTo(n.id)}
          >
            {n.label}
          </button>
        ))}
      </nav>

      <span className="lh-header__spacer" />

      <div className="lh-header__wide">
        <a
          className="lh-github"
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
        >
          <Star size={15} />
          {c.nav.github}
        </a>
        {langSwitch}
        {themeButton}
        <button type="button" className="lh-signin" onClick={onSignIn}>
          {signIn}
        </button>
      </div>

      <Button
        type="button"
        variant="primary"
        className="lh-header__cta"
        onClick={onGetStarted}
      >
        <span className="tiptap-button-text">{cta}</span>
      </Button>

      {/* Phones: everything else in a menu under the header. */}
      <button
        type="button"
        className="lh-icon-btn lh-menu-btn"
        aria-expanded={menuOpen}
        aria-controls="lh-menu"
        aria-label={menuOpen ? c.nav.close : c.nav.menu}
        onClick={() => setMenuOpen((v) => !v)}
      >
        {menuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {menuOpen && (
        <Card id="lh-menu" className="lh-menu">
          <CardBody className="lh-menu__body">
            {c.nav.items.map((n) => (
              <button
                key={n.id}
                type="button"
                className="lh-menu__item"
                onClick={() => goTo(n.id)}
              >
                {n.label}
              </button>
            ))}
            <a
              className="lh-menu__item"
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
            >
              {c.nav.github}
            </a>
            <span className="lh-menu__divider" />
            <div className="lh-menu__row">
              {langSwitch}
              {themeButton}
            </div>
            <button
              type="button"
              className="lh-menu__item"
              onClick={() => {
                setMenuOpen(false);
                onSignIn();
              }}
            >
              {signIn}
            </button>
          </CardBody>
        </Card>
      )}
    </header>
  );
}

// ── The page ──────────────────────────────────────────────────────────────

type HeroTab = "pages" | "databases" | "rooms";

export function HomeView({
  c,
  pages,
  databases,
  onGetStarted,
}: {
  c: HomeCopy;
  /** The live editor. */
  pages: ReactNode;
  /** A database, live. */
  databases: ReactNode;
  onGetStarted: () => void;
}) {
  const [tab, setTab] = useState<HeroTab>("pages");

  const primary = (
    <Button
      type="button"
      variant="primary"
      size="large"
      className="lh-cta"
      onClick={onGetStarted}
    >
      <span className="tiptap-button-text">{c.hero.primary}</span>
    </Button>
  );
  const download = (label: string) => (
    <a className="lh-cta lh-cta--outline" href={RELEASES_URL}>
      <Download size={17} />
      {label}
    </a>
  );

  return (
    <div className="lh">
      {/* ── Hero ── */}
      <section className="lh-hero">
        <button
          type="button"
          className="lh-badge"
          onClick={() => scrollToSection("desktop")}
        >
          <span className="lh-badge__tag">{c.hero.badge}</span>
          <span className="lh-badge__text">{c.hero.badgeText}</span>
          <ArrowRight size={14} />
        </button>
        <h1 className="lh-display">
          {c.hero.title1}
          <br />
          {c.hero.title2}
        </h1>
        <p className="lh-lead lh-lead--hero">{c.hero.lead}</p>
        <div className="lh-actions">
          {primary}
          {download(c.hero.download)}
        </div>
        <p className="lh-fine">{c.hero.fine}</p>

        <div className="lh-tabs" role="tablist">
          {(["pages", "databases", "rooms"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className="lh-tabs__tab"
              onClick={() => setTab(t)}
            >
              {c.hero.tabs[t]}
            </button>
          ))}
        </div>
        <div className="lh-hero__window" role="tabpanel">
          {tab === "pages" && pages}
          {tab === "databases" && databases}
          {tab === "rooms" && (
            <Shot id="rooms" label={c.shot.rooms} className="lh-shot--hero" />
          )}
        </div>
        {tab === "pages" && <p className="lh-fine">{c.hero.hint}</p>}
      </section>

      {/* ── Who it's for ── */}
      <section className="lh-audience">
        <p className="lh-audience__title">{c.audience.title}</p>
        <div className="lh-audience__chips">
          {c.audience.items.map((a) => (
            <span key={a.label} className="lh-chip">
              <span aria-hidden>{a.emoji}</span>
              {a.label}
            </span>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="lh-section" id="features">
        <SectionHead
          eyebrow={c.features.eyebrow}
          title={c.features.title}
          lead={c.features.lead}
        />
        <div className="lh-features">
          {c.features.items.map((f) => (
            <article key={f.title} className="lh-feature">
              <h3 className="lh-feature__title">{f.title}</h3>
              <p className="lh-feature__body">{f.body}</p>
              <Shot
                id={f.shot}
                label={c.shot[f.shot]}
                className="lh-feature__shot"
              />
            </article>
          ))}
        </div>
      </section>

      {/* ── Desktop ── */}
      <section className="lh-split" id="desktop">
        <div className="lh-split__text">
          <span className="lh-eyebrow">{c.desktop.eyebrow}</span>
          <h2 className="lh-h2 lh-h2--left">{c.desktop.title}</h2>
          <p className="lh-lead lh-lead--left">{c.desktop.lead}</p>
          <Points items={c.desktop.points} />
          <div className="lh-actions lh-actions--left">
            {download(c.desktop.cta)}
          </div>
        </div>
        <Shot id="desktop" label={c.shot.desktop} className="lh-split__shot" />
      </section>

      {/* ── Offline ── */}
      <section className="lh-split lh-split--flip" id="offline">
        <div className="lh-split__text">
          <span className="lh-eyebrow">{c.offline.eyebrow}</span>
          <h2 className="lh-h2 lh-h2--left">{c.offline.title}</h2>
          <p className="lh-lead lh-lead--left">{c.offline.lead}</p>
          <Points items={c.offline.points} />
        </div>
        <Shot id="offline" label={c.shot.offline} className="lh-split__shot" />
      </section>

      {/* ── The small things ── */}
      <section className="lh-section">
        <SectionHead eyebrow={c.small.eyebrow} title={c.small.title} />
        <div className="lh-small">
          {c.small.items.map((s) => (
            <article key={s.title} className="lh-small__item">
              <span className="lh-small__glyph" aria-hidden>
                {s.glyph}
              </span>
              <h3 className="lh-small__title">{s.title}</h3>
              <p className="lh-small__body">{s.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Open source ── */}
      <section className="lh-oss" id="open-source">
        <div className="lh-oss__text">
          <span className="lh-eyebrow lh-eyebrow--on-dark">
            {c.oss.eyebrow}
          </span>
          <h2 className="lh-oss__title">
            {c.oss.title1}
            <br />
            {c.oss.title2}
          </h2>
          <p className="lh-oss__lead">{c.oss.lead}</p>
          <div className="lh-actions lh-actions--left">
            <a
              className="lh-cta lh-cta--light"
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
            >
              <Star size={16} />
              {c.oss.github}
            </a>
            {DISCORD_URL && (
              <a
                className="lh-cta lh-cta--ghost-dark"
                href={DISCORD_URL}
                target="_blank"
                rel="noreferrer"
              >
                {c.oss.discord}
              </a>
            )}
          </div>
        </div>
        <div className="lh-oss__facts">
          {c.oss.facts.map((f) => (
            <div key={f.title} className="lh-oss__fact">
              <span aria-hidden>{f.emoji}</span>
              <span className="lh-oss__fact-title">{f.title}</span>
              <span className="lh-oss__fact-body">{f.body}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Call to action ── */}
      <section className="lh-final">
        <h2 className="lh-h2">{c.final.title}</h2>
        <p className="lh-lead">{c.final.lead}</p>
        <div className="lh-actions">
          {primary}
          {download(c.hero.download)}
        </div>
      </section>
    </div>
  );
}

export function HomeFooter({ c }: { c: HomeCopy }) {
  return (
    <footer className="lh-footer">
      <div className="lh-footer__top">
        <div className="lh-footer__brand">
          <span className="lh-logo">
            <FolioMark size={22} title="" />
            Folio
          </span>
          <p>{c.footer.tagline}</p>
        </div>
        {c.footer.columns.map((col) => (
          <div key={col.title} className="lh-footer__col">
            <span className="lh-footer__head">{col.title}</span>
            {col.links.map((l) =>
              l.href.startsWith("#") ? (
                <button
                  key={l.label}
                  type="button"
                  onClick={() =>
                    scrollToSection(l.href.slice(1) as HomeSectionId)
                  }
                >
                  {l.label}
                </button>
              ) : (
                <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
                  {l.label}
                </a>
              ),
            )}
          </div>
        ))}
      </div>
      <div className="lh-footer__bottom">{c.footer.rights}</div>
    </footer>
  );
}

// ── Pieces ────────────────────────────────────────────────────────────────

function SectionHead({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <header className="lh-section__head">
      <span className="lh-eyebrow">{eyebrow}</span>
      <h2 className="lh-h2">{title}</h2>
      {lead && <p className="lh-lead">{lead}</p>}
    </header>
  );
}

function Points({ items }: { items: string[] }) {
  return (
    <ul className="lh-points">
      {items.map((p) => (
        <li key={p}>
          <span className="lh-points__check" aria-hidden>
            <Check size={13} />
          </span>
          {p}
        </li>
      ))}
    </ul>
  );
}

/** A screenshot, or its labelled slot until the image is added. */
function Shot({
  id,
  label,
  className,
}: {
  id: HomeShotId;
  label: string;
  className?: string;
}) {
  const src = HOME_SHOTS[id];
  return (
    <div className={`lh-shot${className ? ` ${className}` : ""}`}>
      {src ? (
        <img src={src} alt={label.replace(/^[^:]*:\s*/, "")} loading="lazy" />
      ) : (
        <span className="lh-shot__label">{label}</span>
      )}
    </div>
  );
}
