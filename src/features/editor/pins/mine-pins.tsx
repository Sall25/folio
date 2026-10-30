import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { Editor, JSONContent } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { useCurrentEditor } from "@tiptap/react";
import { MaterialIcon } from "src/components/icons";
import { usePage } from "src/hooks/use-pages";
import { useDeletePin, usePins } from "src/hooks/use-pins";
import type { Pin } from "src/api/pins";
import { useOptionalActivePage } from "src/features/pages/context/active-page-context";
import { setPendingScrollTarget } from "src/features/inbox/inbox-panel/pending-scroll-target";
import { pinTargets } from "./pin-targets";
import { PinFrame } from "./pin-parts";
import { MirrorBody } from "./pin-mirrors";
import { PIN_ICONS as ICONS } from "./pin-icons";

// The rail's tabs (This page · Mine) and the "Mine" pins: blocks from any
// page, pinned for yourself (the pins table, migration 048).
//
// A pin's block is read from its page's saved content by block id. On the
// page it comes from, the live block is used instead (interactive, like a
// "this page" pin). Everything is drawn into the rail with portals; the tab
// shown is a data attribute on the rail (pins.scss hides the other tab's
// cards), so switching tabs doesn't re-render the editor.

const TAB_KEY = "folio:pin-tab";
type Tab = "page" | "mine";

function readTab(): Tab {
  try {
    return localStorage.getItem(TAB_KEY) === "mine" ? "mine" : "page";
  } catch {
    return "page";
  }
}

export function MinePins() {
  const { editor } = useCurrentEditor();
  const side = useSyncExternalStore(pinTargets.subscribe, () =>
    pinTargets.get("side"),
  );
  const { data: pins } = usePins();
  const mine = useMemo(
    () => (pins ?? []).filter((p) => p.scope === "mine"),
    [pins],
  );

  if (!editor || !side) return null;
  return createPortal(
    <>
      {mine.length > 0 && <PinTabs rail={side} mineCount={mine.length} />}
      {mine.map((pin, i) => (
        <MinePinCard key={pin.id} editor={editor} pin={pin} order={i} />
      ))}
    </>,
    side,
  );
}

function PinTabs({
  rail,
  mineCount,
}: {
  rail: HTMLElement;
  mineCount: number;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>(readTab);
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

function MinePinCard({
  editor,
  pin,
  order,
}: {
  editor: Editor;
  pin: Pin;
  order: number;
}) {
  const { t } = useTranslation();
  const { activePageId, setActivePageId } = useOptionalActivePage();
  const { data: page, isLoading } = usePage(pin.pageId);
  const remove = useDeletePin();

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
      className="is-mine"
      icon={ICONS[type] ?? "keep"}
      label={type ? t(`pins.labels.${type}`) : t("pins.pinnedBlock")}
      order={10_000 + order}
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
