import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, FileText } from "src/components/icons";
import type { PageCover } from "src/types";
import type { PublishedPageLink } from "src/api/pages";
import { usePublishedPage } from "src/hooks/use-publish-page";
import { ShowcaseViewer } from "src/features/showcase/showcase-viewer";
import { DynamicIcon } from "src/features/pages/cover/dynamic-icon";
import { GateLoading } from "src/features/auth/auth-gate";
import { FolioMark } from "src/components/brand/folio-mark/folio-mark";
import { supabase } from "src/api/supabase-client";
import { toPublishedDoc } from "./published-content";
import "./published-page.scss";

// /p/<page id>: a published page, for anyone with the link — signed in or
// not. Read-only, always the latest saved version. When the page is
// published with its subpages, they're listed at the bottom and links
// between them stay on /p/. Rendered outside the signed-in app (no
// sidebar, no providers), so it loads fast for visitors.

const idFromPath = (path: string) => {
  const m = path.match(/^\/p\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
};

function coverBackground(cover: PageCover | null | undefined): string | null {
  if (cover?.coverImage)
    return `center / cover no-repeat url(${cover.coverImage})`;
  if (cover?.gradient) return cover.gradient;
  if (cover?.color && cover.color.startsWith("#")) return cover.color;
  return null;
}

// Follow the visitor's system theme (there's no account to read it from).
function useSystemTheme() {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      document.documentElement.classList.toggle("dark", mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
}

// The editor's global styles (pulled in by the renderer) lock html and body
// to the app's fixed layout, where only inner panes scroll. A published page
// is a normal document: let the window scroll again while it's shown.
function useWindowScroll() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = [html.style.overflowY, body.style.overflowY];
    html.style.overflowY = "auto";
    body.style.overflowY = "auto";
    return () => {
      html.style.overflowY = prev[0];
      body.style.overflowY = prev[1];
    };
  }, []);
}

// Published pages aren't meant for search engines (for now).
function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}

// A page's own icon at any size (the shared row icon has fixed inner sizes,
// which clip in the breadcrumb). Nothing when the page has no icon.
function PageIcon({
  cover,
  size,
}: {
  cover: PageCover | null | undefined;
  size: number;
}) {
  if (!cover?.iconName) return null;
  if (cover.target === "Emoji") {
    return (
      <span
        className="published__emoji"
        style={{ fontSize: size, width: size, height: size }}
        aria-hidden
      >
        {cover.iconName}
      </span>
    );
  }
  return (
    <DynamicIcon
      name={cover.iconName}
      size={size}
      style={{
        flex: "none",
        width: size,
        height: size,
        color:
          !cover.color || cover.color === "var(--tt-text-color)"
            ? "var(--tt-text-primary)"
            : cover.color,
      }}
    />
  );
}

// Signed in or not (only decides between "Sign in" and "Open in Folio").
function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (alive) setSignedIn(!!data.session);
    });
    return () => {
      alive = false;
    };
  }, []);
  return signedIn;
}

// Top bar: the Folio logo (to the landing page), the page's breadcrumb, and
// Sign in — or Open in Folio for someone already signed in.
function PublishedBar({
  pageId,
  children,
}: {
  pageId: string | null;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const signedIn = useSignedIn();
  return (
    <header className="published__bar">
      <a className="published__logo" href="/">
        <FolioMark size={22} title="" />
        <span>Folio</span>
      </a>
      {children && <span className="published__divider" aria-hidden />}
      <div className="published__crumbs-slot">{children}</div>
      {signedIn ? (
        <a
          className="published__action"
          href={pageId ? `/page/${encodeURIComponent(pageId)}` : "/"}
        >
          {t("publish.openInFolio", "Open in Folio")}
        </a>
      ) : (
        <a className="published__action is-primary" href="/signin">
          {t("publish.signIn", "Sign in")}
        </a>
      )}
    </header>
  );
}

export default function PublishedPage() {
  const { t } = useTranslation();
  const [id, setId] = useState(() => idFromPath(window.location.pathname));
  const { data, isLoading, isError } = usePublishedPage(id);
  useSystemTheme();
  useNoIndex();
  useWindowScroll();

  useEffect(() => {
    const onPop = () => setId(idFromPath(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = useCallback((pageId: string) => {
    window.history.pushState(null, "", `/p/${encodeURIComponent(pageId)}`);
    setId(pageId);
    window.scrollTo(0, 0);
  }, []);

  const untitled = t("page.untitled", "Untitled");
  const title = data?.page.title || untitled;

  useEffect(() => {
    document.title = data ? `${title} · Folio` : "Folio";
  }, [data, title]);

  // Links to pages visitors can see stay on /p/; the rest are plain text.
  const visible = useMemo(() => {
    const ids = new Set<string>();
    if (data) {
      ids.add(data.page.id);
      data.trail.forEach((p) => ids.add(p.id));
      data.subpages.forEach((p) => ids.add(p.id));
    }
    return ids;
  }, [data]);

  const doc = useMemo(
    () =>
      data
        ? toPublishedDoc(data.page.content, {
            linkFor: (pageId) => (visible.has(pageId) ? `/p/${pageId}` : null),
            unavailableText: t(
              "publish.unavailableBlock",
              "This block isn't available on published pages.",
            ),
            fallbackTitle: title,
          })
        : null,
    [data, visible, t, title],
  );

  // Clicks on links to other published pages: navigate in place.
  const onClickCapture = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest("a");
    const href = a?.getAttribute("href");
    const target = href ? idFromPath(href) : null;
    if (!target || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    e.stopPropagation();
    go(target);
  };

  if (!id || isError || (!isLoading && !data)) {
    return (
      <div className="published">
        <PublishedBar pageId={null} />
        <div className="published__missing">
          <FileText size={28} aria-hidden />
          <h1>{t("publish.notFoundTitle", "This page isn't published")}</h1>
          <p>
            {t(
              "publish.notFoundText",
              "It may have been unpublished, or the link is wrong.",
            )}
          </p>
          <a className="published__home" href="/">
            {t("publish.goToFolio", "Go to Folio")}
          </a>
        </div>
      </div>
    );
  }

  if (isLoading || !data || !doc) return <GateLoading />;

  const banner = coverBackground(data.page.cover);
  const full = data.page.settings?.width === "full";
  const crumbs: PublishedPageLink[] = data.trail;

  return (
    <div className="published" onClickCapture={onClickCapture}>
      <PublishedBar pageId={data.page.id}>
        <nav
          className="published__crumbs"
          aria-label={t("publish.path", "Path")}
        >
          {crumbs.map((c) => (
            <span key={c.id} className="published__crumb-wrap">
              <a className="published__crumb" href={`/p/${c.id}`}>
                <PageIcon cover={c.cover} size={16} />
                <span>{c.title || untitled}</span>
              </a>
              <ChevronRight size={14} aria-hidden />
            </span>
          ))}
          <span className="published__crumb is-current" aria-current="page">
            <PageIcon cover={data.page.cover} size={16} />
            <span>{title}</span>
          </span>
        </nav>
      </PublishedBar>

      {banner && (
        <div className="published__cover" style={{ background: banner }} />
      )}

      <main className={`published__main${full ? " is-full" : ""}`}>
        {data.page.cover?.iconName && (
          <div className={`published__icon${banner ? " on-cover" : ""}`}>
            <PageIcon cover={data.page.cover} size={64} />
          </div>
        )}

        <ShowcaseViewer key={data.page.id} content={doc} />

        {data.subpages.length > 0 && (
          <section className="published__subpages" aria-labelledby="pub-sub">
            <h2 id="pub-sub" className="published__subpages-title">
              {t("publish.subpages", "Pages")}
            </h2>
            <ul>
              {data.subpages.map((p) => (
                <li key={p.id}>
                  <a className="published__subpage" href={`/p/${p.id}`}>
                    {p.cover?.iconName ? (
                      <PageIcon cover={p.cover} size={18} />
                    ) : (
                      <FileText size={18} aria-hidden />
                    )}
                    <span>{p.title || untitled}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
