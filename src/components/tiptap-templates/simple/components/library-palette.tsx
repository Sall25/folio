import {
  Lock,
  CircleUser,
  Clock,
  Clock1,
  Star,
  Users,
  PanelRight,
  Users2,
} from "lucide-react";
import type { ID, Page, PageCategory, Person } from "src/types";
import { PageItemIcon } from "../page-item-icon";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Badge } from "src/components/tiptap-ui-primitive/badge";
import { useActivePageActions } from "../context/active-page-context";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { Avatar } from "src/components/tiptap-ui-primitive/avatar";
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import "./library-palette.scss";
import { useChildPages, usePages } from "src/hooks/use-pages";
import { usePeople } from "src/hooks/use-people";
import { useLibrary } from "../context/library-context";
import { formatRelativeTime } from "src/utils/format-relative";
import { FileIcon } from "src/components/tiptap-icons";
import { useCurrentPerson } from "src/hooks/use-session";
import { useCollabProvider } from "../context/collab-provider-context";
import { usePresence } from "../hooks/use-presence";
import { useIsMobile } from "src/hooks/use-breakpoint";
import { useCurrentSpace } from "src/hooks/use-current-space";
import { useCreatePageInSpace } from "src/api/use-create-page-in-space";

export type LibraryTab =
  | Exclude<PageCategory, "Template" | "Recent">
  | "Recents";

// Inside a teamspace only two tabs make sense: its recents, and its pages
// (the "Teamspaces" tab, relabelled). Favorites / Shared / Private are
// workspace concepts.
const TEAMSPACE_TABS: LibraryTab[] = ["Recents", "Teamspaces"];

function Tabs({
  active,
  onChange,
  inTeamspace,
}: {
  active: LibraryTab;
  onChange: (t: LibraryTab) => void;
  inTeamspace: boolean;
}) {
  const { t } = useTranslation();
  const allTabs: { id: LibraryTab; label: string; Icon: typeof Clock1 }[] = [
    { id: "Recents", label: t("library.tabs.recents"), Icon: Clock1 },
    { id: "Favorites", label: t("library.tabs.favorites"), Icon: Star },
    { id: "Shared", label: t("library.tabs.shared"), Icon: Users },
    { id: "Private", label: t("library.tabs.private"), Icon: Lock },
    {
      id: "Teamspaces",
      label: inTeamspace
        ? t("sidebar.pages", "Pages")
        : t("library.tabs.teamspaces"),
      Icon: Users2,
    },
  ];
  const tabs = inTeamspace
    ? allTabs.filter((tab) => TEAMSPACE_TABS.includes(tab.id))
    : allTabs;

  return (
    <ButtonGroup orientation="horizontal">
      {tabs.map(({ id, label, Icon }, i) => (
        <div key={id} style={{ display: "flex", alignItems: "center" }}>
          {i > 0 && <Spacer orientation="horizontal" size={15} />}
          <Button
            variant={active === id ? undefined : "ghost"}
            data-highlighted={active === id ? true : undefined}
            style={{ borderRadius: "var(--tt-radius-xl)" }}
            onClick={() => onChange(id)}
          >
            <Icon className="tiptap-button-icon" />
            <span className="tiptap-button-text">{label}</span>
          </Button>
        </div>
      ))}
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
  fontFamily: "inherit",
  fontWeight: 400,
};

const dataStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: "inherit",
  lineHeight: 1.4,
  color: "var(--tt-text-color)",
  fontFamily: "inherit",
};

function RecentRow({
  page,
  depth = 0,
  onlineIds,
  peopleById,
  currentPersonId,
  isMobile,
}: {
  page: Page;
  depth?: number;
  onlineIds: Set<ID>;
  peopleById: Map<ID, Person>;
  currentPersonId: ID | undefined;
  isMobile: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [show, setShow] = useState(false);
  const [expanded, setExpanded] = useState<Set<ID>>(new Set());
  const { setActivePageId } = useActivePageActions();
  const toggle = (id: ID) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  const navigate = (id: ID) => {
    setActivePageId(id);
  };

  const children = useChildPages(page.id);
  const hasChildren = (children.data?.length ?? 0) > 0;
  const isOpen = expanded.has(page.id);

  const owner = page.ownerId ? peopleById.get(page.ownerId) : undefined;
  const ownerDisplayName =
    page.ownerId === currentPersonId ? "You" : (owner?.name ?? "Unknown");
  const ownerOnline = page.ownerId ? onlineIds.has(page.ownerId) : false;

  return (
    <>
      <div
        key={`${page.id}-title`}
        style={{ ...cellStyle, paddingLeft: depth * 20 }}
      >
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
              {page.title || t("page.untitled")}
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
                <span className="tiptap-button-text">{t("actions.open")}</span>
              </Button>
            )}
          </CardItemGroup>
          {page.settings?.locked && (
            <Badge data-style="gray">
              <Lock className="tiptap-badge-icon" />
              <span className="tiptap-badge-text">{t("page.locked")}</span>
            </Badge>
          )}
        </CardItemGroup>
      </div>

      {!isMobile && (
        <div key={`${page.id}-author`} style={cellStyle}>
          <Avatar
            size="sm"
            src={owner?.avatarUrl}
            name={ownerDisplayName}
            online={ownerOnline}
          />
          <span style={{ ...dataStyle, fontWeight: 500 }}>
            {ownerDisplayName}
          </span>
        </div>
      )}

      {!isMobile && (
        <div key={`${page.id}-date`} style={cellStyle}>
          <span style={dataStyle}>
            {formatRelativeTime(
              page.updatedAt ?? page.createdAt,
              t,
              i18n.language,
            )}
          </span>
        </div>
      )}

      {isOpen &&
        children.data?.map((child) => (
          <RecentRow
            key={child.id}
            page={child}
            depth={depth + 1}
            onlineIds={onlineIds}
            peopleById={peopleById}
            currentPersonId={currentPersonId}
            isMobile={isMobile}
          />
        ))}
    </>
  );
}

function RecentGrid({
  rows,
  onlineIds,
  peopleById,
  currentPersonId,
  isMobile,
}: {
  rows: Page[];
  onlineIds: Set<ID>;
  peopleById: Map<ID, Person>;
  currentPersonId: ID | undefined;
  isMobile: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 1fr",
        width: "100%",
      }}
    >
      <div style={headerStyle}>
        <Button variant="ghost">
          <FileIcon className="tiptap-button-icon" />
          <span className="tiptap-button-text">
            {t("library.columns.page")}
          </span>
        </Button>
      </div>
      {!isMobile && (
        <>
          <div style={headerStyle}>
            <Button variant="ghost">
              <CircleUser className="tiptap-button-icon" />
              <span className="tiptap-button-text">
                {t("library.columns.createdBy")}
              </span>
            </Button>
          </div>
          <div style={headerStyle}>
            <Button variant="ghost">
              <Clock className="tiptap-button-icon" />
              <span className="tiptap-button-text">
                {t("library.columns.lastEdited")}
              </span>
            </Button>
          </div>
        </>
      )}

      {rows.map((page) => (
        <div key={page.id} style={{ display: "contents" }}>
          <RecentRow
            page={page}
            onlineIds={onlineIds}
            peopleById={peopleById}
            currentPersonId={currentPersonId}
            isMobile={isMobile}
          />
        </div>
      ))}
    </div>
  );
}

// Per-tab empty copy (i18n keys, resolved with t() at render).
const TAB_EMPTY: Record<LibraryTab, string> = {
  Recents: "library.empty.recents",
  Favorites: "library.empty.favorites",
  Shared: "library.empty.shared",
  Private: "library.empty.private",
  Teamspaces: "library.empty.teamspaces",
};

const byRecency = (a: Page, b: Page) =>
  new Date(b.updatedAt ?? b.createdAt).getTime() -
  new Date(a.updatedAt ?? a.createdAt).getTime();

export function LibraryPalette({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation();
  const { data: pages } = usePages();
  const { data: people = [] } = usePeople();
  const { person } = useCurrentPerson();
  const { setActivePageId } = useActivePageActions();
  const { activeTab } = useLibrary();
  const space = useCurrentSpace();
  const teamspaceId = space.kind === "teamspace" ? space.id : null;
  const inTeamspace = teamspaceId != null;
  const { createPageInSpace } = useCreatePageInSpace();

  // A workspace-only tab (e.g. opened from the Favorites section) doesn't
  // exist inside a teamspace — fall back to Recents there.
  const initialTab: LibraryTab =
    inTeamspace && activeTab && !TEAMSPACE_TABS.includes(activeTab)
      ? "Recents"
      : (activeTab ?? "Recents");
  const [tab, setTab] = useState<LibraryTab>(initialTab);

  const provider = useCollabProvider();
  const presenceUsers = usePresence(provider);
  const onlineIds = useMemo(
    () => new Set(presenceUsers.map((u) => u.id)),
    [presenceUsers],
  );
  const peopleById = useMemo(
    () => new Map((people as Person[]).map((p) => [p.id, p])),
    [people],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Rows for the active tab, scoped to the current space.
  // Workspace:
  //   - Recents: every page, newest first, top 8 (children not nested).
  //   - Category tabs: top-level pages of that category, as a tree.
  // Teamspace:
  //   - Recents: pages inside it (not the root), newest first, top 8.
  //   - Pages ("Teamspaces" tab): the root's direct children, as a tree.
  const rows = useMemo<Page[]>(() => {
    if (!pages) return [];

    if (teamspaceId) {
      if (tab === "Recents") {
        return pages
          .filter((p) => p.teamspaceId === teamspaceId && p.id !== teamspaceId)
          .sort(byRecency)
          .slice(0, 8);
      }
      return pages.filter((p) => p.parentId === teamspaceId).sort(byRecency);
    }

    if (tab === "Recents") {
      return [...pages].sort(byRecency).slice(0, 8);
    }

    const category = tab as PageCategory;
    return pages
      .filter((p) => p.parentId == null && p.category === category)
      .sort(byRecency);
  }, [pages, tab, teamspaceId]);

  const isMobile = useIsMobile();

  const newPage = () => {
    createPageInSpace(t("page.newPage"))
      .then((page) => {
        if (page) setActivePageId(page.id);
      })
      .catch(() => console.error("Failed to create page"));
  };

  if (!pages) return null;

  return (
    <div className="library-palette-content__inner">
      <CardItemGroup
        orientation="vertical"
        style={{ alignItems: "flex-start" }}
      >
        <CardItemGroup
          style={{ width: "100%", alignItems: "center" }}
          orientation="horizontal"
        >
          <span className="library">
            {inTeamspace && space.kind === "teamspace"
              ? (space.page?.title ?? t("teamspaces.untitled"))
              : t("library.title")}
          </span>
          <Spacer orientation="horizontal" />
          <Button
            variant="primary"
            style={{
              color: "white",
              borderRadius: "var(--tt-radius-sm)",
            }}
            onClick={newPage}
          >
            <span className="tiptap-button-text" style={{ width: "75px" }}>
              {t("actions.newPage")}
            </span>
          </Button>
        </CardItemGroup>

        <Spacer orientation="vertical" size={10} />

        <Tabs active={tab} onChange={setTab} inTeamspace={inTeamspace} />
        <Spacer orientation="vertical" size={10} />

        {rows.length > 0 ? (
          <RecentGrid
            rows={rows}
            onlineIds={onlineIds}
            peopleById={peopleById}
            currentPersonId={person?.id}
            isMobile={isMobile}
          />
        ) : (
          <div className="library-empty">
            <FileIcon className="library-empty__icon" />
            <p className="library-empty__text">{t(TAB_EMPTY[tab])}</p>
            {tab === "Recents" && rows.length === 0 && (
              <button
                className="library-palette-content__new-btn"
                onClick={newPage}
              >
                {t("library.createFirst")}
              </button>
            )}
          </div>
        )}
      </CardItemGroup>
    </div>
  );
}
