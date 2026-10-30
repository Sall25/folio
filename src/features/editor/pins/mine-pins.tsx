import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { Editor, JSONContent } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { useCurrentEditor } from "@tiptap/react";
import { MaterialIcon } from "src/components/icons";
import { usePage } from "src/hooks/use-pages";
import { usePeopleBase } from "src/hooks/use-people";
import { Avatar } from "src/components/tiptap-ui-primitive/avatar";
import { useDeletePin, usePins } from "src/hooks/use-pins";
import type { Pin } from "src/api/pins";
import { useOptionalActivePage } from "src/features/pages/context/active-page-context";
import { setPendingScrollTarget } from "src/features/inbox/inbox-panel/pending-scroll-target";
import { pinTargets } from "./pin-targets";
import { PinFrame } from "./pin-parts";
import { MirrorBody } from "./pin-mirrors";
import { PIN_ICONS as ICONS } from "./pin-icons";

// The rail's tabs (This page · Mine · Team) and the pins across pages
// (the pins table, migration 048): "Mine" are yours, on every page; "Team"
// belong to the open page's teamspace, for all its members.
//
// A pin's block is read from its page's saved content by block id. On the
// page it comes from, the live block is used instead (interactive, like a
// "this page" pin). Everything is drawn into the rail with portals; the tab
// shown is a data attribute on the rail (pins.scss hides the other tab's
// cards), so switching tabs doesn't re-render the editor.

const TAB_KEY = "folio:pin-tab";
type Tab = "page" | "mine" | "team";

function readTab(): Tab {
  try {
    const v = localStorage.getItem(TAB_KEY);
    return v === "mine" || v === "team" ? v : "page";
  } catch {
    return "page";
  }
}

export function MinePins() {
  const { t } = useTranslation();
  const { editor } = useCurrentEditor();
  const side = useSyncExternalStore(pinTargets.subscribe, () =>
    pinTargets.get("side"),
  );
  const { activePage } = useOptionalActivePage();
  const teamspaceId = activePage?.teamspaceId ?? null;
  const { data: pins } = usePins();
  const mine = useMemo(
    () => (pins ?? []).filter((p) => p.scope === "mine"),
    [pins],
  );
  const team = useMemo(
    () =>
      teamspaceId
        ? (pins ?? []).filter(
            (p) => p.scope === "teamspace" && p.teamspaceId === teamspaceId,
          )
        : [],
    [pins, teamspaceId],
  );

  if (!editor || !side) return null;
  return createPortal(
    <>
      <PinTabs
        rail={side}
        mineCount={mine.length}
        teamCount={teamspaceId ? team.length : null}
      />
      {mine.length === 0 && (
        <div
          className="pin-frame is-mine pin-mine__empty"
          style={{ order: 10_000 }}
        >
          {t("pins.mineEmpty")}
        </div>
      )}
      {mine.map((pin, i) => (
        <PinCard
          key={pin.id}
          editor={editor}
          pin={pin}
          order={10_000 + i}
          className="is-mine"
        />
      ))}
      {teamspaceId && team.length === 0 && (
        <div
          className="pin-frame is-team pin-mine__empty"
          style={{ order: 20_000 }}
        >
          {t("pins.teamEmpty")}
        </div>
      )}
      {team.map((pin, i) => (
        <PinCard
          key={pin.id}
          editor={editor}
          pin={pin}
          order={20_000 + i}
          className="is-team"
        />
      ))}
    </>,
    side,
  );
}

function PinTabs({
  rail,
  mineCount,
  teamCount,
}: {
  rail: HTMLElement;
  mineCount: number;
  /** null: the open page isn't in a teamspace (no Team tab). */
  teamCount: number | null;
}) {
  const { t } = useTranslation();
  const [chosen, setTab] = useState<Tab>(readTab);
  // No Team tab outside a teamspace: show This page instead.
  const tab: Tab = chosen === "team" && teamCount === null ? "page" : chosen;
  // The rail is outside React's tree here: its attribute is set directly.
  useEffect(() => {
    rail.setAttribute("data-tab", tab);
    return () => rail.removeAttribute("data-tab");
  }, [rail, tab]);
  const choose = (next: Tab) => {
    setTab(next);
    try {
      localStorage.setItem(TAB_KEY, next);
    } catch {
      /* storage blocked */
    }
  };
  return (
    <div className="pin-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={tab === "page"}
        className="pin-tabs__tab"
        onClick={() => choose("page")}
      >
        {t("pins.tabs.page")}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === "mine"}
        className="pin-tabs__tab"
        onClick={() => choose("mine")}
      >
        {t("pins.tabs.mine")}
        <span className="pin-tabs__count">{mineCount}</span>
      </button>
      {teamCount !== null && (
        <button
          type="button"
          role="tab"
          aria-selected={tab === "team"}
          className="pin-tabs__tab"
          onClick={() => choose("team")}
        >
          {t("pins.tabs.team")}
          <span className="pin-tabs__count">{teamCount}</span>
        </button>
      )}
    </div>
  );
}

/** The block with this id in a saved document, or null. */
function findBlock(doc: JSONContent | null | undefined, id: string) {
  if (!doc) return null;
  const walk = (node: JSONContent): JSONContent | null => {
    if (node.attrs?.id === id) return node;
    for (const child of node.content ?? []) {
      const hit = walk(child);
      if (hit) return hit;
    }
    return null;
  };
  return walk(doc);
}

/** The block with this id in the open editor, with its position. */
function findLive(editor: Editor, id: string) {
  let found: { node: PMNode; pos: number } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (found) return false;
    if (node.attrs.id === id) {
      found = { node, pos };
      return false;
    }
    return true;
  });
  return found as { node: PMNode; pos: number } | null;
}

function PinCard({
  editor,
  pin,
  order,
  className,
}: {
  editor: Editor;
  pin: Pin;
  order: number;
  className: string;
}) {
  const { t } = useTranslation();
  const { activePageId, setActivePageId } = useOptionalActivePage();
  const { data: page, isLoading } = usePage(pin.pageId);
  const remove = useDeletePin();
  // Team pins: who pinned it.
  const { data: pinner } = usePeopleBase((people) =>
    pin.scope === "teamspace"
      ? (people.find((p) => p.id === pin.personId) ?? null)
      : null,
  );

  const onThisPage = pin.pageId === activePageId;
  const live = onThisPage ? findLive(editor, pin.blockId) : null;
  const node = useMemo(() => {
    if (live) return live.node;
    const json = findBlock(page?.content, pin.blockId);
    if (!json) return null;
    try {
      return editor.schema.nodeFromJSON(json);
    } catch {
      return null; // a block type this editor doesn't know
    }
  }, [live, page?.content, pin.blockId, editor]);

  const goTo = () => {
    setPendingScrollTarget({ pageId: pin.pageId, targetNodeId: pin.blockId });
    if (!onThisPage) setActivePageId(pin.pageId);
    else
      document
        .querySelector(`[data-id="${pin.blockId}"]`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const type = node?.type.name ?? "";
  return (
    <PinFrame
      className={className}
      icon={ICONS[type] ?? "keep"}
      label={type ? t(`pins.labels.${type}`) : t("pins.pinnedBlock")}
      order={order}
      extra={
        pinner ? (
          <Avatar name={pinner.name} src={pinner.avatarUrl} size="xs" />
        ) : undefined
      }
      onGoTo={goTo}
      onUnpin={() => remove.mutate(pin.id)}
    >
      {node ? (
        <MirrorBody
          editor={editor}
          node={node}
          pos={live?.pos ?? 0}
          readOnly={!live}
        />
      ) : isLoading ? null : (
        <div className="pin-mine__missing">
          <MaterialIcon name={page ? "link_off" : "lock"} size={16} />
          {page ? t("pins.removed") : t("pins.noAccess")}
        </div>
      )}
      {page && (
        <button type="button" className="pin-mine__source" onClick={goTo}>
          <MaterialIcon name="description" size={13} />
          <span>{page.title || t("page.untitled")}</span>
        </button>
      )}
    </PinFrame>
  );
}
