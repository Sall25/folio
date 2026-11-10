import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutTemplate,
  MessageSquarePlus,
  PencilIcon,
  Plus,
  Search,
} from "src/components/icons";
import type { Page } from "src/types";
import { useRecentPages } from "src/hooks/use-pages";
import { useCurrentPerson } from "src/hooks/use-session";
import { useCurrentSpace } from "src/hooks/use-current-space";
import { useActivePageActions } from "src/features/pages/context/active-page-context";
import { PageItemIcon } from "src/features/pages/page-item/page-item-icon";
import { useTemplates } from "src/features/pages/templates/templates-context";
import { useEditorLayout } from "src/features/shell/context/editor-layout-context";
import { CreateRoomModal } from "src/features/chat/chat-modals";
import {
  openQuickCapture,
  shortcutLabel,
  useCaptureShortcut,
} from "src/features/desktop/quick-capture/capture-shortcut";
import { Greeting } from "../greeting/greeting";
import { HomeForYou } from "../home-rail";
import { homeWhen } from "../home-time";
import { useHomeActions } from "../use-home-actions";
import { HomeCards } from "./home-cards";
import { HomePeople } from "./home-people";
import { HomeRooms } from "./home-rooms";
import "./desktop-home.scss";

// Home in the desktop app: a launcher. One box searches the space's pages
// by title as you type, or creates a page with the typed title; ↑ ↓ move
// through the list under it (your recent pages while the box is empty) and
// Enter opens. Below the box: New page, Quick note, New chat and Templates.
// Then your recent pages as cards (the arrow keys move between them while
// the box is empty; typing turns them into a list of matches), "For you"
// below them, and on the side the members (who's online, and where) and
// the latest messages in your rooms. A wash of the space's accent colour at
// the top.
//
// The layout follows the room left beside the sidebar (container queries,
// desktop-home.scss): four cards a row with the side column, then three,
// then one column with two cards a row, then everything stacked and the
// quick actions two by two. The web app keeps its own Home.

const RECENT_SHOWN = 8;
const MATCHES_SHOWN = 8;
const FOR_YOU_SHOWN = 4;

/** Lowercase, without accents: "Leçon" matches "lecon". */
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const editedAt = (p: Page) => p.updatedAt ?? p.createdAt;

export function DesktopHome() {
  const { t, i18n } = useTranslation();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const cardsRef = useRef<HTMLUListElement>(null);
  const { person } = useCurrentPerson();
  const space = useCurrentSpace();
  const teamspaceId = space.kind === "teamspace" ? space.id : null;
  const { data } = useRecentPages();
  const { setActivePageId } = useActivePageActions();
  const { newPage } = useHomeActions();
  const { onOpenChange: openTemplates } = useTemplates();
  const { collapsed, expandedWidth, setSidebarView, onCollapsedChange } =
    useEditorLayout();
  const { shortcut: captureShortcut } = useCaptureShortcut();

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [newRoomOpen, setNewRoomOpen] = useState(false);

  const allPages = useMemo(() => data ?? [], [data]);
  // The current space's pages, newest edit first (as the web Home).
  const pages = useMemo(
    () =>
      allPages.filter(
        (p) =>
          p.category !== "Template" &&
          p.sourceId == null &&
          (teamspaceId == null ||
            (p.teamspaceId === teamspaceId && p.id !== teamspaceId)),
      ),
    [allPages, teamspaceId],
  );

  const q = fold(query.trim());
  const rows = useMemo(
    () =>
      q
        ? pages
            .filter((p) => fold(p.title || "").includes(q))
            .slice(0, MATCHES_SHOWN)
        : pages.slice(0, RECENT_SHOWN),
    [pages, q],
  );
  // While typing, the last row creates a page with the typed title.
  const rowCount = rows.length + (q ? 1 : 0);
  const activeRow = Math.min(active, Math.max(rowCount - 1, 0));

  const open = (page: Page) => setActivePageId(page.id);

  // ↑ ↓ through the list of matches.
  const listStep = (key: string) =>
    key === "ArrowDown" ? 1 : key === "ArrowUp" ? -1 : 0;
  // Every direction through the cards; a row is as many cards as the grid
  // has columns at this width.
  const cardStep = (key: string) => {
    const el = cardsRef.current;
    const columns = el
      ? getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean)
          .length
      : 1;
    if (key === "ArrowRight") return 1;
    if (key === "ArrowLeft") return -1;
    if (key === "ArrowDown") return columns;
    if (key === "ArrowUp") return -columns;
    return 0;
  };
  const choose = (index: number) => {
    if (index < rows.length) open(rows[index]);
    else if (q) newPage(query);
    setQuery("");
  };

  // "/" anywhere on Home (not while typing elsewhere) goes to the box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (
        el &&
        (el.isContentEditable ||
          el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA")
      )
        return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openInbox = () => {
    setSidebarView("inbox");
    if (collapsed) onCollapsedChange(false);
  };
  const openChats = () => {
    setSidebarView("chats");
    if (collapsed) onCollapsedChange(false);
  };

  const today = new Date().toLocaleDateString(i18n.language, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const spaceName =
    space.kind === "teamspace"
      ? space.page?.title || t("teamspaces.untitled")
      : null;

  return (
    // The view runs under the sidebar: Home starts where it ends (as the
    // web Home does), so it centres and measures itself in what's visible.
    <div
      className="dhome-frame"
      style={{ paddingLeft: collapsed ? 0 : expandedWidth }}
    >
      <div className="dhome">
        <div className="dhome__wash" aria-hidden />

        <header className="dhome__greet">
          <Greeting name={person?.name} compact className="dhome__title" />
          <p className="dhome__sub">
            {today}
            {spaceName && (
              <>
                {" · "}
                <span className="dhome__space">
                  {space.kind === "teamspace" && space.page && (
                    <PageItemIcon
                      cover={space.page.cover}
                      styles={{ width: 14, height: 14, fontSize: 13 }}
                    />
                  )}
                  {spaceName}
                </span>
              </>
            )}
          </p>
        </header>

        <section className="dhome__cmd" aria-label={t("home.search.label")}>
          <label className="dhome__box">
            <Search size={17} aria-hidden className="dhome__box-icon" />
            <span className="dhome__hidden">{t("home.search.label")}</span>
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={
                rowCount ? `${listId}-${activeRow}` : undefined
              }
              className="dhome__input"
              placeholder={t("home.search.placeholder")}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setQuery("");
                  return;
                }
                if (!rowCount) return;
                if (e.key === "Enter") {
                  e.preventDefault();
                  choose(activeRow);
                  return;
                }
                const step = q ? listStep(e.key) : cardStep(e.key);
                if (step === 0) return;
                e.preventDefault();
                setActive(
                  Math.min(Math.max(activeRow + step, 0), rowCount - 1),
                );
              }}
            />
            <kbd className="dhome__kbd">/</kbd>
          </label>

          <div className="dhome__actions">
            <button
              type="button"
              className="dhome__action"
              onClick={() => newPage()}
            >
              <span className="dhome__action-name">
                <Plus size={15} aria-hidden />
                {t("home.newPage")}
              </span>
              <span className="dhome__action-hint">
                {spaceName ?? t("home.place.private")}
              </span>
            </button>
            <button
              type="button"
              className="dhome__action"
              onClick={openQuickCapture}
            >
              <span className="dhome__action-name">
                <PencilIcon size={15} aria-hidden />
                {t("quickCapture.title")}
              </span>
              <span className="dhome__action-hint">
                {captureShortcut ? (
                  <kbd className="dhome__kbd">
                    {shortcutLabel(captureShortcut)}
                  </kbd>
                ) : (
                  t("desktopHome.fromAnyApp")
                )}
              </span>
            </button>
            <button
              type="button"
              className="dhome__action"
              onClick={() => setNewRoomOpen(true)}
            >
              <span className="dhome__action-name">
                <MessageSquarePlus size={15} aria-hidden />
                {t("chat.newRoom", "New room")}
              </span>
              <span className="dhome__action-hint">
                {t("desktopHome.roomHint")}
              </span>
            </button>
            <button
              type="button"
              className="dhome__action"
              onClick={() => openTemplates?.(true)}
            >
              <span className="dhome__action-name">
                <LayoutTemplate size={15} aria-hidden />
                {t("home.actions.template")}
              </span>
              <span className="dhome__action-hint">
                {t("desktopHome.templatesHint")}
              </span>
            </button>
          </div>
        </section>

        <div className="dhome__cols">
          <div className="dhome__main">
            <section>
              <h2 className="dhome__h">
                {q ? t("desktopHome.matches") : t("home.recent")}
                <span className="dhome__h-hint">
                  {q ? t("desktopHome.keysHint") : t("desktopHome.cardsHint")}
                </span>
              </h2>
              {q ? (
                <ul id={listId} role="listbox" className="dhome__list">
                  {rows.map((p, i) => (
                    <li
                      key={p.id}
                      id={`${listId}-${i}`}
                      role="option"
                      aria-selected={i === activeRow}
                      className="dhome__row"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => choose(i)}
                    >
                      <PageItemIcon
                        cover={p.cover}
                        styles={{ width: 18, height: 18, fontSize: 15 }}
                      />
                      <span className="dhome__row-title">
                        {p.title || t("page.untitled")}
                      </span>
                      <span className="dhome__row-when">
                        {homeWhen(editedAt(p), t, i18n.language)}
                      </span>
                      {i === activeRow && <kbd className="dhome__kbd">↵</kbd>}
                    </li>
                  ))}
                  <li
                    id={`${listId}-${rows.length}`}
                    role="option"
                    aria-selected={activeRow === rows.length}
                    className="dhome__row dhome__row--create"
                    onMouseEnter={() => setActive(rows.length)}
                    onClick={() => choose(rows.length)}
                  >
                    <Plus size={16} aria-hidden />
                    <span className="dhome__row-title">
                      {t("home.search.create", { title: query.trim() })}
                    </span>
                    {activeRow === rows.length && (
                      <kbd className="dhome__kbd">↵</kbd>
                    )}
                  </li>
                </ul>
              ) : rows.length === 0 ? (
                <p className="dhome__none">{t("home.nothingHere")}</p>
              ) : (
                <HomeCards
                  ref={cardsRef}
                  id={listId}
                  pages={rows}
                  allPages={allPages}
                  active={activeRow}
                  onActive={setActive}
                  onOpen={open}
                />
              )}
            </section>

            <HomeForYou
              onOpenInbox={openInbox}
              collapsedCount={FOR_YOU_SHOWN}
            />
          </div>

          <aside className="dhome__side">
            <HomePeople teamspaceId={teamspaceId} pages={allPages} />
            <HomeRooms pages={allPages} onOpenChats={openChats} />
          </aside>
        </div>

        {newRoomOpen && (
          <CreateRoomModal onClose={() => setNewRoomOpen(false)} />
        )}
      </div>
    </div>
  );
}
