import { useMemo, useState } from "react";
import type { Page } from "src/types";
import { useTranslation } from "react-i18next";
import { BookOpen, Check, ChevronDown } from "lucide-react";
import { useRecentPages } from "src/hooks/use-pages";
import { useActivePageActions } from "../pages/context/active-page-context";
import { PageItemIcon } from "../pages/page-item/page-item-icon";
import { HOME_GUIDES, type HomeGuide } from "./home-guides";
import { ShowcaseReader } from "src/features/showcase/showcase-reader";
import type { ShowcaseId } from "src/features/showcase/showcases";
import { Greeting } from "src/features/home/greeting/greeting";
import { useCurrentPerson } from "src/hooks/use-session";
import { useEditorLayout } from "../shell/context/editor-layout-context";
import { useCurrentSpace } from "src/hooks/use-current-space";
import { useIsMobile } from "src/hooks/use-breakpoint";
import { useTeamspacePins } from "src/hooks/use-teamspace-pins";
import { usePersonNames } from "src/hooks/use-person-names";
import { TabItem, TabList } from "src/components/tiptap-ui-primitive/tabs";
import { HomeForYou } from "./home-rail";
import { useGuidesRead } from "./use-guides-read";
import { homeWhen } from "./home-time";
import "./home-page-content.scss";

// Home: the greeting, "For you" (the latest notifications and unread rooms,
// in a card), then your pages in a table — Recent, Favorites (Pinned in a
// teamspace) or Created by me — showing where each page lives, who edited it
// last and when. The next guide to read closes the page. Search, New page and
// templates live in the home toolbar (see HomeToolbar).

const RECENT_STEP = 10;
const PINNED_MAX = 12;

const editedAt = (p: Page) => p.updatedAt ?? p.createdAt;

type Tab = "recent" | "pinned" | "mine";

export function HomePageContent({ userName }: { userName?: string }) {
  const { t } = useTranslation();
  const { data, isPending } = useRecentPages();
  const { setActivePageId } = useActivePageActions();
  const {
    collapsed: sidebarCollapsed,
    expandedWidth,
    setSidebarView,
    onCollapsedChange,
  } = useEditorLayout();
  const [openGuide, setOpenGuide] = useState<ShowcaseId | null>(null);
  const [recentLimit, setRecentLimit] = useState(RECENT_STEP);
  const [tab, setTab] = useState<Tab>("recent");

  const { person } = useCurrentPerson();
  const space = useCurrentSpace();
  const teamspaceId = space.kind === "teamspace" ? space.id : null;
  const { pinnedIds } = useTeamspacePins(teamspaceId);

  const guidesRead = useGuidesRead();

  const allPages = useMemo(() => data ?? [], [data]);

  // Home follows the current space: inside a teamspace, only its pages (not
  // the root page itself); in your workspace, everything.
  const pages = useMemo(
    () =>
      allPages.filter(
        (p) =>
          p.category !== "Template" &&
          (teamspaceId == null ||
            (p.teamspaceId === teamspaceId && p.id !== teamspaceId)),
      ),
    [allPages, teamspaceId],
  );

  // Teamspace: the space's shared pins. Workspace: your favourites.
  const pinned = useMemo(() => {
    if (teamspaceId) {
      return pinnedIds
        .map((id) => allPages.find((p) => p.id === id))
        .filter((p): p is Page => !!p)
        .slice(0, PINNED_MAX);
    }
    return pages.filter((p) => p.category === "Favorites").slice(0, PINNED_MAX);
  }, [teamspaceId, pinnedIds, allPages, pages]);

  const mine = useMemo(
    () =>
      pages
        .filter((p) => person && p.ownerId === person.id)
        .sort((a, b) => b.createdAt - a.createdAt),
    [pages, person],
  );

  const rows =
    tab === "recent"
      ? pages.slice(0, recentLimit)
      : tab === "pinned"
        ? pinned
        : mine.slice(0, recentLimit);
  const hasMore =
    (tab === "recent" && pages.length > recentLimit) ||
    (tab === "mine" && mine.length > recentLimit);

  const openInbox = () => {
    setSidebarView("inbox");
    if (sidebarCollapsed) onCollapsedChange(false);
  };

  const openGuideCard = (guide: HomeGuide) => {
    guidesRead.markRead(guide.id);
    if (guide.pageId) setActivePageId(guide.pageId);
    else if (guide.showcaseId) setOpenGuide(guide.showcaseId);
  };

  const isMobile = useIsMobile();
  const marginLeftRight = isMobile ? "16px" : "6vw";

  return (
    <div
      className="home-page-content"
      style={{
        maxWidth: "100%",
        margin: isMobile
          ? `0 ${marginLeftRight}`
          : sidebarCollapsed
            ? `0 ${marginLeftRight}`
            : "0 auto",
        paddingLeft: sidebarCollapsed ? 0 : expandedWidth,
      }}
    >
      <div className="home-dense">
        <div className="home-dense__body">
          <Greeting name={userName} className="home-dense__greeting" compact />

          <HomeForYou onOpenInbox={openInbox} />

          <section className="home-dense__pages" aria-label={t("home.pages")}>
            <TabList className="home-dense__tabs" aria-label={t("home.pages")}>
              <TabItem
                label={t("home.recent")}
                active={tab === "recent"}
                onSelect={() => setTab("recent")}
              />
              <TabItem
                label={teamspaceId ? t("home.pinned") : t("home.favorites")}
                active={tab === "pinned"}
                onSelect={() => setTab("pinned")}
              />
              <TabItem
                label={t("home.createdByMe")}
                active={tab === "mine"}
                onSelect={() => setTab("mine")}
              />
            </TabList>

            {isPending ? (
              <RecentSkeleton />
            ) : tab === "recent" && pages.length === 0 ? (
              <EmptyState />
            ) : rows.length === 0 ? (
              <p className="home-dense__none">{t("home.nothingHere")}</p>
            ) : (
              <PagesTable
                pages={rows}
                allPages={allPages}
                inTeamspace={teamspaceId != null}
                onOpen={(p) => setActivePageId(p.id)}
              />
            )}

            {!isPending && hasMore && (
              <button
                type="button"
                className="home-dense__more"
                onClick={() => setRecentLimit((n) => n + RECENT_STEP)}
              >
                {t("home.showMore")}
              </button>
            )}
          </section>

          <LearnBanner
            guides={HOME_GUIDES}
            readIds={guidesRead.readIds}
            onOpen={openGuideCard}
          />
        </div>
      </div>
      <ShowcaseReader id={openGuide} onClose={() => setOpenGuide(null)} />
    </div>
  );
}

// ── Pages table ─────────────────────────────────────────────────────────────
// One row per page: its icon and title, where it lives (teamspace, Private
// or Shared — hidden inside a teamspace, where it's always that one), who
// changed it last, and when. The whole row opens the page; the title is the
// button keyboard users reach.
function PagesTable({
  pages,
  allPages,
  inTeamspace,
  onOpen,
}: {
  pages: Page[];
  allPages: Page[];
  inTeamspace: boolean;
  onOpen: (page: Page) => void;
}) {
  const { t, i18n } = useTranslation();
  const { person } = useCurrentPerson();
  const nameOf = usePersonNames(true);

  const placeOf = (p: Page): string => {
    if (p.teamspaceId) {
      const root = allPages.find((x) => x.id === p.teamspaceId);
      return root?.title || t("teamspaces.untitled");
    }
    return p.category === "Shared"
      ? t("home.place.shared")
      : t("home.place.private");
  };

  const editorOf = (p: Page): string => {
    const id = p.editedBy ?? p.ownerId;
    if (!id) return "—";
    return id === person?.id ? t("home.you") : nameOf(id);
  };

  return (
    <div className="home-table__scroll">
      <table className="home-table">
        <thead>
          <tr>
            <th scope="col">{t("home.table.page")}</th>
            {!inTeamspace && (
              <th scope="col" className="home-table__in">
                {t("home.table.in")}
              </th>
            )}
            <th scope="col" className="home-table__by">
              {t("home.table.editedBy")}
            </th>
            <th scope="col" className="home-table__when">
              {t("home.table.when")}
            </th>
          </tr>
        </thead>
        <tbody>
          {pages.map((p) => (
            <tr key={p.id} onClick={() => onOpen(p)}>
              <td>
                <button
                  type="button"
                  className="home-table__title"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(p);
                  }}
                >
                  <PageItemIcon
                    cover={p.cover}
                    styles={{ width: 16, height: 16, fontSize: 16 }}
                  />
                  <span>{p.title || t("page.untitled")}</span>
                </button>
              </td>
              {!inTeamspace && <td className="home-table__in">{placeOf(p)}</td>}
              <td className="home-table__by">{editorOf(p)}</td>
              <td className="home-table__when">
                {homeWhen(editedAt(p), t, i18n.language)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LearnBanner({
  guides,
  readIds,
  onOpen,
}: {
  guides: HomeGuide[];
  readIds: string[];
  onOpen: (guide: HomeGuide) => void;
}) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  const available = guides.filter((g) => g.showcaseId || g.pageId);
  if (available.length === 0) return null;
  const read = available.filter((g) => readIds.includes(g.id)).length;
  const next = available.find((g) => !readIds.includes(g.id));

  const percent = Math.round((read / available.length) * 100);

  return (
    <section className="home-learn" aria-labelledby="home-learn">
      <div className="home-learn__head">
        <span className="home-learn__badge" aria-hidden>
          <BookOpen size={19} />
        </span>
        {next ? (
          <button
            type="button"
            className="home-learn__next"
            onClick={() => onOpen(next)}
          >
            <span id="home-learn" className="home-learn__kicker">
              {t("home.learnProgress", { read, total: available.length })}
            </span>
            <span className="home-learn__title">
              {read === 0
                ? t("home.learnStart", { title: t(next.titleKey, next.title) })
                : t("home.learnContinue", {
                    title: t(next.titleKey, next.title),
                  })}
            </span>
            <span className="home-learn__meta">
              <span className="home-learn__bar" aria-hidden>
                <span style={{ width: `${percent}%` }} />
              </span>
              {t("home.readMinutes", "{{count}} min read", {
                count: next.readMinutes,
              })}
            </span>
          </button>
        ) : (
          <span id="home-learn" className="home-learn__done">
            {t("home.learnDone")}
          </span>
        )}
        <button
          type="button"
          className="home-learn__toggle"
          aria-expanded={showAll}
          aria-controls="home-learn-list"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? t("home.learnHide") : t("home.learnAll")}
          <ChevronDown
            size={14}
            aria-hidden
            className={showAll ? "is-open" : undefined}
          />
        </button>
      </div>
      {showAll && (
        <ul id="home-learn-list" className="home-learn__list">
          {available.map((g) => {
            const done = readIds.includes(g.id);
            return (
              <li key={g.id}>
                <button
                  type="button"
                  className="home-learn__row"
                  onClick={() => onOpen(g)}
                >
                  <span
                    className={`home-learn__check${done ? " is-done" : ""}`}
                    aria-hidden
                  >
                    {done && <Check size={11} strokeWidth={3} />}
                  </span>
                  <span className="home-learn__row-title">
                    {t(g.titleKey, g.title)}
                  </span>
                  <span className="home-learn__row-meta">
                    {done
                      ? t("home.learnRead")
                      : t("home.readMinutes", "{{count}} min read", {
                          count: g.readMinutes,
                        })}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// No pages yet: New page and search in the toolbar are the way in.
function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="home-empty">
      <p className="home-empty__title">{t("home.emptyTitle")}</p>
      <p className="home-empty__desc">{t("home.emptyDesc")}</p>
    </div>
  );
}

function RecentSkeleton() {
  return (
    <div aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="home-skeleton-row" />
      ))}
    </div>
  );
}
