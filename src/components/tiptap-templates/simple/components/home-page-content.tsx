/* eslint-disable @typescript-eslint/no-explicit-any */
import { Clock, Pin, FileText, ChevronRight, Lock } from "lucide-react";
import type { Page } from "../types";
import { PageItemIcon } from "../page-item-icon";
import "./home-page-content.scss";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Badge } from "src/components/tiptap-ui-primitive/badge";
import { useActivePage } from "../use-active-page";

function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(Number(dateStr));
  if (isNaN(date.getTime())) return "—";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}min ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Yesterday";
  if (diffD < 7) return `${diffD} days ago`;
  return date.toLocaleDateString();
}

function flattenPages(pages: Page[]): Page[] {
  return pages.flatMap((p) => [p, ...flattenPages(p.children ?? [])]);
}

function getExcerpt(page: Page): string {
  try {
    const nodes = (page.content?.content as any[]) ?? [];
    for (const node of nodes) {
      if (node.type === "paragraph" && node.content?.length) {
        const text = node.content
          .filter((n: any) => n.type === "text")
          .map((n: any) => n.text as string)
          .join("");
        if (text.trim()) return text;
      }
    }
  } catch {
    // ignore
  }
  return "";
}

function PinnedCard({ page, onClick }: { page: Page; onClick: () => void }) {
  const excerpt = getExcerpt(page);

  return (
    <div className="home-pinned-card" onClick={onClick}>
      <div className="home-pinned-card__cover">
        <PageItemIcon cover={page.cover} styles={{ fontSize: 28 }} />
      </div>
      <div className="home-pinned-card__title">{page.title || "Untitled"}</div>
      <div className="home-pinned-card__meta">
        {formatRelativeTime(page.updatedAt ?? page.createdAt)}
      </div>
      {excerpt && <div className="home-pinned-card__excerpt">{excerpt}</div>}
    </div>
  );
}

function RecentRow({ page, onClick }: { page: Page; onClick: () => void }) {
  return (
    <div className="home-recent-row" onClick={onClick}>
      <div className="home-recent-row__icon">
        <PageItemIcon cover={page.cover} styles={{ fontSize: 15 }} />
      </div>
      <div className="home-recent-row__body">
        <span className="home-recent-row__title">
          {page.title || "Untitled"}
        </span>
        {page.settings?.locked && (
          <Badge data-style="gray">
            <Lock className="tiptap-badge-icon" />
            <span className="tiptap-badge-text">Locked</span>
          </Badge>
        )}
      </div>
      <Badge>
        <Clock className="tiptap-badge-icon" />
        <span className="tiptap-badge-text">
          {formatRelativeTime(page.updatedAt ?? page.createdAt)}
        </span>
      </Badge>
      <ChevronRight size={13} className="home-recent-row__arrow" />
    </div>
  );
}

export function HomePageContent({ sidebarWidth }: { sidebarWidth: number }) {
  const { pages, addPageAndActivateAsync, setActivePageId } = useActivePage();

  if (!pages) return null;

  const flat = flattenPages(pages);

  const sorted = [...flat].sort((a, b) => {
    const aDate = new Date(a.updatedAt ?? a.createdAt).getTime();
    const bDate = new Date(b.updatedAt ?? b.createdAt).getTime();
    return bDate - aDate;
  });

  const pinned = pages.slice(0, 4);
  const recent = sorted.slice(0, 8);

  const navigate = (id: number) => setActivePageId(id);

  return (
    <div
      className="home-page-content"
      style={{
        marginLeft: sidebarWidth,
        transition: "margin-left 0.2s ease",
      }}
    >
      <div className="home-page-content__inner">
        <div className="home-page-content__header">
          <div>
            <h1 className="home-page-content__title">Home</h1>
            <p className="home-page-content__sub">Your workspace at a glance</p>
          </div>
          {/* <Button
            // className="home-page-content__new-btn"
            data-state-active="on"
            style={{
              background: "var(--tt-brand-color-400)",
              color: "white",
              borderRadius: "var(--tt-radius-sm)",
            }}
            onClick={() =>
              addPageAndActivateAsync({ title: "New Page", parentId: null })
            }
          >
            + New page
          </Button> */}
        </div>

        {pinned.length > 0 && (
          <section className="home-section">
            <div className="home-section__label">
              <Pin size={12} />
              Pinned
            </div>
            <div className="home-pinned-grid">
              {pinned.map((page) => (
                <PinnedCard
                  key={page.id}
                  page={page}
                  onClick={() => navigate(page.id)}
                />
              ))}
            </div>
          </section>
        )}

        {recent.length > 0 && (
          <section className="home-section">
            <Button
              variant="ghost"
              data-active-state="on"
              style={{ maxWidth: 100 }}
            >
              <Clock className="tiptap-button-icon" />
              <span>Recent</span>
            </Button>

            <div className="home-recent-list">
              {recent.map((page) => (
                <CardItemGroup orientation="vertical" key={page.id}>
                  <Separator orientation="horizontal" />
                  <RecentRow page={page} onClick={() => navigate(page.id)} />
                </CardItemGroup>
              ))}
            </div>
          </section>
        )}

        {pages.length === 0 && (
          <div className="home-empty">
            <FileText size={32} className="home-empty__icon" />
            <p className="home-empty__text">No pages yet</p>
            <button
              className="home-page-content__new-btn"
              onClick={() =>
                addPageAndActivateAsync({ title: "New Page", parentId: null })
              }
            >
              Create your first page
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
