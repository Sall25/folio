import type { Page, PageCover } from "src/types";
import type { TFunction } from "i18next";
import { useRecentPages } from "src/hooks/use-pages";
import { useCreatePage } from "src/hooks/use-create-page";
import { useActivePage } from "../context/active-page-context";
import { useTemplates } from "../context/templates-context";
import { makePage } from "src/utils/make-page";
import { PageItemIcon } from "../page-item-icon";
import { Plus, LayoutGrid } from "lucide-react";
import { useTranslation } from "react-i18next";
import { List, ListItem } from "src/components/tiptap-ui-primitive/list/list";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { Greeting } from "src/components/tiptap-ui-primitive/greeting/greeting";
import {
  Board,
  BoardContent,
  BoardCover,
} from "src/components/tiptap-ui-primitive/board/board";
import { getPageExcerpt } from "src/lib/get-page-excerpt";

const GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
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
  const { setActivePageId } = useActivePage();
  const createPage = useCreatePage();
  const { onOpenChange: openTemplates } = useTemplates();

  const recents = (data ?? []).filter((p) => p.category !== "Template");
  const visited = recents.slice(0, 4);
  const earlier = recents.slice(4, 12);

  const newPage = () => {
    const page = makePage({
      title: t("page.newPage"),
      parentId: null,
      category: "Private",
    });
    createPage.mutate(page);
    setActivePageId(page.id);
  };

  return (
    <div
      style={{
        maxWidth: "80%",
        margin: "0 auto",
        padding: "32px 24px 48px",
        paddingLeft: "20rem",
        overflowY: "auto",
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
      </div>

      {/* quick actions */}
      <div
        style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}
      >
        <ButtonGroup orientation="horizontal" style={{ gap: 8 }}>
          <Button data-active-state="on" variant="ghost" onClick={newPage}>
            <Plus className="tiptap-button-icon" />
            <span className="tiptap-button-text">{t("actions.newPage")}</span>
          </Button>
          <Button variant="ghost" onClick={() => openTemplates?.(true)}>
            <LayoutGrid className="tiptap-button-icon" />
            <span className="tiptap-button-text">{t("sidebar.templates")}</span>
          </Button>
        </ButtonGroup>
      </div>

      {/* recently visited */}
      <SectionLabel>{t("home.recentlyVisited")}</SectionLabel>
      {isPending ? (
        <CardGridSkeleton />
      ) : visited.length === 0 ? (
        <EmptyState onNewPage={newPage} />
      ) : (
        <div style={{ ...GRID, marginBottom: earlier.length ? 32 : 0 }}>
          {visited.map((page) => (
            <RecentCard
              key={page.id}
              page={page}
              onOpen={() => setActivePageId(page.id)}
            />
          ))}
        </div>
      )}

      {/* earlier */}
      {earlier.length > 0 && (
        <>
          <SectionLabel>{t("home.earlier")}</SectionLabel>
          <List showLines spacing="compact">
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
    <Board onClick={onOpen}>
      <BoardCover
        style={{
          height: 64,
          background: coverBackground(page.cover),
        }}
      />
      <BoardContent>
        <PageItemIcon cover={page.cover} styles={{ width: 18, height: 18 }} />
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--tt-text-color)",
            marginTop: 6,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontFamily: "inherit",
          }}
        >
          {page.title || t("page.untitled")}
        </div>
        <span
          style={{
            fontSize: 11,
            color: "var(--tt-text-color)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontFamily: "inherit",
          }}
        >
          {getPageExcerpt(page)}
        </span>
        <div
          style={{
            fontSize: 12,
            color: "var(--tt-text-secondary)",
            marginTop: 2,
            whiteSpace: "nowrap",
            fontFamily: "inherit",
          }}
        >
          {t("home.edited", {
            time: formatRelative(
              page.updatedAt ?? page.createdAt,
              t,
              i18n.language,
            ),
          })}
        </div>
      </BoardContent>
    </Board>
  );
  // return (
  //   <button
  //     type="button"
  //
  //     style={{
  //       display: "flex",
  //       flexDirection: "column",
  //       width: "100%",
  //       minWidth: 0,
  //       overflow: "hidden",
  //       border: "0.5px solid var(--tt-border-color)",
  //       borderRadius: 12,
  //       background: "var(--tt-card-bg-color)",
  //       cursor: "pointer",
  //       padding: 0,
  //       textAlign: "left",
  //       transition: "border-color 0.12s",
  //     }}
  //     onMouseEnter={(e) =>
  //       (e.currentTarget.style.borderColor = "var(--tt-brand-color-500)")
  //     }
  //     onMouseLeave={(e) =>
  //       (e.currentTarget.style.borderColor = "var(--tt-border-color)")
  //     }
  //   >
  //     <div
  //       style={{
  //         height: 64,
  //         background: coverBackground(page.cover),
  //         borderBottom: "0.5px solid var(--tt-border-color)",
  //       }}
  //     />
  //     <div style={{ padding: "10px 12px", minWidth: 0 }}>
  //       <PageItemIcon cover={page.cover} styles={{ width: 18, height: 18 }} />
  //       <div
  //         style={{
  //           fontSize: 14,
  //           color: "var(--tt-text-color)",
  //           marginTop: 6,
  //           overflow: "hidden",
  //           textOverflow: "ellipsis",
  //           whiteSpace: "nowrap",
  //         }}
  //       >
  //         {page.title || "Untitled"}
  //       </div>
  //       <div
  //         style={{ fontSize: 12, color: "var(--tt-theme-muted)", marginTop: 2 }}
  //       >
  //         Edited {formatRelative(page.updatedAt ?? page.createdAt)}
  //       </div>
  //     </div>
  //   </button>
  // );
}

function EmptyState({ onNewPage }: { onNewPage: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        border: "0.5px dashed var(--tt-border-color)",
        borderRadius: 12,
        padding: "32px 16px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: "var(--tt-text-color)",
          marginBottom: 4,
        }}
      >
        {t("home.emptyTitle")}
      </div>
      <div
        style={{
          fontSize: 13,
          color: "var(--tt-theme-muted)",
          marginBottom: 14,
        }}
      >
        {t("home.emptyDesc")}
      </div>
      <Button variant="ghost" onClick={onNewPage}>
        <Plus className="tiptap-button-icon" />
        <span className="tiptap-button-text">{t("actions.newPage")}</span>
      </Button>
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
