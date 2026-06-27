import type { Page, PageCover } from "src/types";
import { useRecentPages } from "src/hooks/use-pages";
import { useCreatePage } from "src/hooks/use-create-page";
import { useActivePage } from "../context/active-page-context";
import { useTemplates } from "../context/templates-context";
import { makePage } from "src/utils/make-page";
import { PageItemIcon } from "../page-item-icon";
import { Plus, LayoutGrid } from "lucide-react";
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

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "yesterday";
  if (day < 7) return `${day}d ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const todayLabel = () =>
  new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

export function HomePageContent({ userName }: { userName?: string }) {
  const { data, isPending } = useRecentPages();
  const { setActivePageId } = useActivePage();
  const createPage = useCreatePage();
  const { onOpenChange: openTemplates } = useTemplates();

  const recents = (data ?? []).filter((p) => p.category !== "Template");
  const visited = recents.slice(0, 4);
  const earlier = recents.slice(4, 12);

  const newPage = () => {
    const page = makePage({
      title: "New Page",
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
          {todayLabel()}
        </div>
      </div>

      {/* quick actions */}
      <div
        style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}
      >
        <ButtonGroup orientation="horizontal" style={{ gap: 8 }}>
          <Button data-active-state="on" variant="ghost" onClick={newPage}>
            <Plus className="tiptap-button-icon" />
            <span className="tiptap-button-text">New page</span>
          </Button>
          <Button variant="ghost" onClick={() => openTemplates?.(true)}>
            <LayoutGrid className="tiptap-button-icon" />
            <span className="tiptap-button-text">Templates</span>
          </Button>
        </ButtonGroup>
      </div>

      {/* recently visited */}
      <SectionLabel>Recently visited</SectionLabel>
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
          <SectionLabel>Earlier</SectionLabel>
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
                    {page.title || "Untitled"}
                  </span>
                  <span
                    style={{ fontSize: 12, color: "var(--tt-text-secondary)" }}
                  >
                    {formatRelative(page.updatedAt ?? page.createdAt)}
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
          {page.title || "Untitled"}
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
          Edited {formatRelative(page.updatedAt ?? page.createdAt)}
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
        Start your first page
      </div>
      <div
        style={{
          fontSize: 13,
          color: "var(--tt-theme-muted)",
          marginBottom: 14,
        }}
      >
        Your recently opened pages will show up here.
      </div>
      <Button variant="ghost" onClick={onNewPage}>
        <Plus className="tiptap-button-icon" />
        <span className="tiptap-button-text">New page</span>
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
