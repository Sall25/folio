import type { Page, PageCover } from "src/types";
import type { TFunction } from "i18next";
import { useRecentPages } from "src/hooks/use-pages";
import { useCreatePage } from "src/hooks/use-create-page";
import { useActivePageActions } from "../context/active-page-context";
import { makePage } from "src/utils/make-page";
import { PageItemIcon } from "../page-item-icon";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { List, ListItem } from "src/components/tiptap-ui-primitive/list/list";
import { Greeting } from "src/components/tiptap-ui-primitive/greeting/greeting";
import {
  Board,
  BoardContent,
  BoardCover,
  BoardIcon,
  BoardMeta,
  BoardTitle,
} from "src/components/tiptap-ui-primitive/board/board";
import { getPageExcerpt } from "src/lib/get-page-excerpt";
import { useCurrentPerson } from "src/hooks/use-session";
import "./home-page-content.scss";
import { useEditorLayout } from "../context/editor-layout-context";
import { useCurrentWorkspace } from "src/hooks/use-workspaces";
import { useCurrentSpace } from "src/hooks/use-current-space";

const GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
  gap: 12,
};

// cover → CSS background (image > gradient > color), same as the gallery
function coverBackground(cover: PageCover | undefined): string {
  if (cover?.coverImage)
    return `center / cover no-repeat url(${cover.coverImage})`;
  if (cover?.gradient) return cover.gradient;
  if (cover?.color) return cover.color;
  return "var(--tt-hover-bg-color, rgba(0,0,0,0.04))";
}

function formatRelative(ts: number, t: TFunction, locale?: string): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return t("home.time.justNow");
  const min = Math.floor(sec / 60);
  if (min < 60) return t("home.time.minutesAgo", { count: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t("home.time.hoursAgo", { count: hr });
  const day = Math.floor(hr / 24);
  if (day === 1) return t("home.time.yesterday");
  if (day < 7) return t("home.time.daysAgo", { count: day });
  return new Date(ts).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });
}

const todayLabel = (locale?: string) =>
  new Date().toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

export function HomePageContent({ userName }: { userName?: string }) {
  const { t, i18n } = useTranslation();
  const { data, isPending } = useRecentPages();
  const { setActivePageId } = useActivePageActions();
  const { collapsed: sidebarCollapsed, expandedWidth } = useEditorLayout();
  const createPage = useCreatePage();

  const { person } = useCurrentPerson();
  const { workspaceId } = useCurrentWorkspace();
  const space = useCurrentSpace();
  const teamspaceId = space.kind === "teamspace" ? space.id : null;

  // Home follows the current space: inside a teamspace, only its pages (not
  // the root page itself); in your workspace, everything as before.
  const recents = (data ?? []).filter(
    (p) =>
      p.category !== "Template" &&
      (teamspaceId == null ||
        (p.teamspaceId === teamspaceId && p.id !== teamspaceId)),
  );
  const visited = recents.slice(0, 7);
  const earlier = recents.slice(7, 12);

  const newPage = () => {
    if (!person || !workspaceId) return;
    // Inside a teamspace, the new page goes INTO it (child of the root); the
    // server trigger stamps teamspace_id and pins it to the host workspace.
    const page =
      space.kind === "teamspace"
        ? makePage({
            title: t("page.newPage"),
            parentId: space.id,
            category: "Teamspaces",
            ownerId: person.id,
            workspaceId: space.page?.workspaceId ?? workspaceId,
            teamspaceId: space.id,
          })
        : makePage({
            title: t("page.newPage"),
            parentId: null,
            category: "Private",
            ownerId: person.id,
            workspaceId,
          });
    createPage.mutate(page);
    setActivePageId(page.id);
  };

  return (
    <div
      style={{
        maxWidth: "100%",
        margin: sidebarCollapsed ? "5vh 12vw" : "5vh auto",
        paddingLeft: sidebarCollapsed ? 0 : expandedWidth,
        overflowY: "scroll",
      }}
    >
      {/* greeting */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          marginBottom: 28,
        }}
      >
        <Greeting name={userName} />
        <div style={{ fontSize: 13, color: "var(--tt-theme-muted)" }}>
          {todayLabel(i18n.language)}
        </div>
        {space.kind === "teamspace" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 6,
              fontSize: 13,
              fontWeight: 500,
              color: "var(--tt-text-secondary)",
            }}
          >
            {space.page && (
              <PageItemIcon
                cover={space.page.cover}
                styles={{ width: 15, height: 15, fontSize: 15 }}
              />
            )}
            <span>{space.page?.title || t("teamspaces.untitled")}</span>
          </div>
        )}
      </div>

      {isPending ? (
        <CardGridSkeleton />
      ) : visited.length === 0 ? (
        <EmptyState onNewPage={newPage} />
      ) : (
        <>
          {/* recently visited */}
          <SectionLabel>{t("home.recentlyVisited")}</SectionLabel>
          <div style={{ ...GRID, marginBottom: earlier.length ? 32 : 0 }}>
            {visited.map((page) => (
              <RecentCard
                key={page.id}
                page={page}
                onOpen={() => setActivePageId(page.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* earlier */}
      {earlier.length > 0 && (
        <>
          <SectionLabel>{t("home.earlier")}</SectionLabel>
          <List className="recent-list" showLines spacing="compact">
            {earlier.map((page, i) => (
              <ListItem
                key={page.id}
                showLine={i !== earlier.length - 1}
                onClick={() => setActivePageId(page.id)}
                style={{ cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <PageItemIcon
                    cover={page.cover}
                    styles={{ width: 17, height: 17 }}
                  />
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: 14,
                      lineHeight: 1.4,
                      color: "var(--tt-text-color)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontFamily: "inherit",
                    }}
                  >
                    {page.title || t("page.untitled")}
                  </span>
                  <span
                    style={{ fontSize: 12, color: "var(--tt-text-secondary)" }}
                  >
                    {formatRelative(
                      page.updatedAt ?? page.createdAt,
                      t,
                      i18n.language,
                    )}
                  </span>
                </div>
              </ListItem>
            ))}
          </List>
        </>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 500,
        color: "var(--tt-text-secondary, var(--tt-theme-muted))",
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

function RecentCard({ page, onOpen }: { page: Page; onOpen: () => void }) {
  const { t, i18n } = useTranslation();
  return (
    <Board className="recent-card" onClick={onOpen}>
      <BoardCover
        height={68}
        style={{ background: coverBackground(page.cover) }}
      />
      <BoardIcon hang size={20} align="start">
        <PageItemIcon cover={page.cover} styles={{ width: 18, height: 18 }} />
      </BoardIcon>

      <BoardContent>
        <BoardTitle style={{ fontSize: 14, fontWeight: 500 }}>
          {page.title || t("page.untitled")}
        </BoardTitle>

        <span
          style={{
            fontSize: 11,
            color: "var(--tt-text-color)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {getPageExcerpt(page)}
        </span>

        <BoardMeta>
          {t("home.edited", {
            time: formatRelative(
              page.updatedAt ?? page.createdAt,
              t,
              i18n.language,
            ),
          })}
        </BoardMeta>
      </BoardContent>
    </Board>
  );
}

function EmptyState({ onNewPage }: { onNewPage: () => void }) {
  const { t } = useTranslation();

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: 300,
      }}
    >
      <button
        type="button"
        onClick={onNewPage}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "16px 26px",
          border: "1px solid var(--tt-border-color)",
          borderRadius: 12,
          background: "var(--tt-bg-color)",
          color: "var(--tt-text-color)",
          fontSize: 15,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        <Plus size={19} strokeWidth={1.8} />
        {t("home.newPage")}
      </button>
    </div>
  );
}

function CardGridSkeleton() {
  return (
    <div style={GRID}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 124,
            borderRadius: 12,
            border: "0.5px solid var(--tt-border-color)",
            background: "var(--tt-hover-bg-color, rgba(0,0,0,0.03))",
          }}
        />
      ))}
    </div>
  );
}
