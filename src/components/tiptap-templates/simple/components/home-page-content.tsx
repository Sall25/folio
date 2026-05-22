/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  FileText,
  ChevronRight,
  Lock,
  File,
  CircleUser,
  Clock,
  Clock1,
  Star,
  Users,
  PanelRight,
} from "lucide-react";
import type { Page } from "../types";
import { PageItemIcon } from "../page-item-icon";
import "./home-page-content.scss";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Badge } from "src/components/tiptap-ui-primitive/badge";
import { useActivePage } from "../use-active-page";
import { useEditorLayout } from "../context/editor-layout-context";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { AvatarDemo } from "src/components/tiptap-ui-primitive/avatar";
import { useState } from "react";

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

function Tabs() {
  return (
    <ButtonGroup orientation="horizontal">
      <Button
        data-highlighted={true}
        style={{ borderRadius: "var(--tt-radius-xl)" }}
      >
        <Clock1 className="tiptap-button-icon" />
        <span className="tiptap-button-text">Recents</span>
      </Button>
      <Spacer orientation="horizontal" size={15} />
      <Button variant="ghost">
        <Star className="tiptap-button-icon" />
        <span className="tiptap-button-text">Favorites</span>
      </Button>
      <Spacer orientation="horizontal" size={15} />
      <Button variant="ghost">
        <Users className="tiptap-button-icon" />
        <span className="tiptap-button-text">Shared</span>
      </Button>
      <Spacer orientation="horizontal" size={15} />
      <Button variant="ghost">
        <Lock className="tiptap-button-icon" />
        <span className="tiptap-button-text">Private</span>
      </Button>
    </ButtonGroup>
  );
}

const headerStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: "var(--tt-theme-text)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  padding: "0 0 8px",
  borderBottom: "0.5px solid var(--tt-border-color, rgba(0,0,0,0.08))",
};

const cellStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 0",
  minWidth: 0,
  color: "var(--tt-text-color)",
  borderBottom: "0.5px solid var(--tt-border-color, rgba(0,0,0,0.08))",
};

const dataStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 400,
  color: "var(--tt-text-color)",
};

function RecentRow({ page, depth = 0 }: { page: Page; depth?: number }) {
  const [show, setShow] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const { setActivePageId } = useActivePage();
  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  const navigate = (id: number) => setActivePageId(id);

  const hasChildren = (page.children?.length ?? 0) > 0;
  const isOpen = expanded.has(page.id);

  return (
    <>
      <div
        key={`${page.id}-title`}
        style={{ ...cellStyle, paddingLeft: depth * 20 }}
      >
        {/* Chevron toggle or spacer */}
        <span
          style={{
            width: 16,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            cursor: hasChildren ? "pointer" : "default",
            color: "var(--tt-text-color)",
            transition: "transform 0.18s ease",
            transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
          }}
          onClick={hasChildren ? () => toggle(page.id) : undefined}
        >
          {hasChildren && (
            <svg
              width="8"
              height="8"
              viewBox="0 0 8 8"
              style={{ display: "block" }}
            >
              <polygon
                points={isOpen ? "0,0 8,0 4,8" : "0,0 8,4 0,8"}
                fill="currentColor"
              />
            </svg>
          )}
        </span>

        <CardItemGroup orientation="horizontal" style={{ width: "100%" }}>
          <CardItemGroup
            orientation="horizontal"
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
            style={{ width: "100%" }}
          >
            <PageItemIcon cover={page.cover} styles={{ fontSize: 15 }} />
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: 14,
                fontWeight: depth === 0 ? 500 : 400,
                color: "var(--tt-text-color)",
              }}
            >
              {page.title || "Untitled"}
            </span>

            <Spacer orientation="horizontal" />
            {show && (
              <Button
                style={{
                  background: "transparent",
                  border: "1px solid var(--tt-border-color)",
                  borderRadius: "var(--tt-radius-sm)",
                  minHeight: 22,
                  height: 22,
                }}
                onClick={() => navigate(page.id)}
              >
                <PanelRight className="tiptap-button-icon" />
                <span className="tiptap-button-text">Open</span>
              </Button>
            )}
          </CardItemGroup>
          {page.settings?.locked && (
            <Badge data-style="gray">
              <Lock className="tiptap-badge-icon" />
              <span className="tiptap-badge-text">Locked</span>
            </Badge>
          )}
        </CardItemGroup>
      </div>

      <div key={`${page.id}-author`} style={cellStyle}>
        <AvatarDemo />
        <span style={dataStyle}>Jule Sall</span>
      </div>

      <div key={`${page.id}-date`} style={cellStyle}>
        <span style={dataStyle}>
          {formatRelativeTime(page.updatedAt ?? page.createdAt)}
        </span>
      </div>
      {/* Render children if expanded */}
      {isOpen &&
        page.children?.map((child) => (
          <RecentRow key={child.id} page={child} depth={depth + 1} />
        ))}
    </>
  );
}

// Add this to your state or component-level state
function RecentGrid({ recent }: { recent: Page[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr 1fr",
        width: "100%",
      }}
    >
      {/* Headers */}
      <div style={headerStyle}>
        <Button variant="ghost">
          <File className="tiptap-button-icon" />
          <span className="tiptap-button-text">Page</span>
        </Button>
      </div>
      <div style={headerStyle}>
        <Button variant="ghost">
          <CircleUser className="tiptap-button-icon" />
          <span className="tiptap-button-text">Created by</span>
        </Button>
      </div>
      <div style={headerStyle}>
        <Button variant="ghost">
          <Clock className="tiptap-button-icon" />
          <span className="tiptap-button-text">Last edited time</span>
        </Button>
      </div>

      {recent.map((page) => (
        <div key={page.id} style={{ display: "contents" }}>
          <RecentRow page={page} />
        </div>
      ))}
    </div>
  );
}

export function HomePageContent() {
  const { sidebarWidth } = useEditorLayout();
  const { pages, addPageAndActivateAsync } = useActivePage();

  if (!pages) return null;

  const flat = flattenPages(pages);

  const sorted = [...flat].sort((a, b) => {
    const aDate = new Date(a.updatedAt ?? a.createdAt).getTime();
    const bDate = new Date(b.updatedAt ?? b.createdAt).getTime();
    return bDate - aDate;
  });
  const recent = sorted.slice(0, 8);

  return (
    <div
      className="home-page-content"
      style={{
        marginLeft: sidebarWidth,
        transition: "margin-left 0.2s ease",
      }}
    >
      <div className="home-page-content__inner">
        {/* <div className="home-page-content__header">
          <Greeting name="Jule" className="home-greeting" />
        </div> */}
        <CardItemGroup
          orientation="vertical"
          style={{ alignItems: "flex-start" }}
        >
          <CardItemGroup
            style={{ width: "100%", alignItems: "center" }}
            orientation="horizontal"
          >
            <span className="library">Library</span>
            <Spacer orientation="horizontal" />
            <Button
              style={{
                background: "var(--tt-brand-color-400)",
                color: "white",
                borderRadius: "var(--tt-radius-sm)",
              }}
            >
              <span
                className="tiptap-button-text"
                style={{ whiteSpace: "nowrap" }}
              >
                New Page
              </span>
            </Button>
          </CardItemGroup>

          <Spacer orientation="vertical" size={10} />

          <Tabs />
          <Spacer orientation="vertical" size={10} />

          {recent.length > 0 && <RecentGrid recent={recent} />}

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
        </CardItemGroup>
      </div>
    </div>
  );
}
