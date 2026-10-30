import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useCurrentEditor, useEditorState } from "@tiptap/react";
import { MaterialIcon } from "src/components/icons";
import {
  useEditorLayoutActions,
  useEditorLayoutState,
} from "src/features/shell/context/editor-layout-context";
import { useLayoutMode } from "src/features/shell/hooks/use-layout-mode";
import { pagePinCount, pinTargets } from "./pin-targets";
import { countPagePins, usePinCounts } from "./use-pin-counts";
import "./pins.scss";

// The pins pane: opened from the toolbar's pin button, the same full-height
// pane on the right as the comments. Its tabs: This page (blocks pinned on
// the open page), Mine (yours, from any page) and Team (the page's
// teamspace). Its body is where pinned blocks are drawn ("side" in
// pin-targets.ts): the page's own pinned blocks, the mirrors and the cards
// for Mine / Team all portal in; the tab is a data attribute on the body
// (pins.scss shows one tab's cards), so switching never re-renders them.
//
// Mounted inside the page editor (page-editor-layout.tsx); drawn on <body>.

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

export function PinsPane() {
  const { pinsOpen } = useEditorLayoutState();
  const { mode } = useLayoutMode();
  return (
    <>
      <PagePinCount />
      {pinsOpen &&
        mode === "desktop" &&
        createPortal(<PaneContent />, document.body)}
    </>
  );
}

/** Keeps the toolbar's count of this page's pins up to date. */
function PagePinCount() {
  const { editor } = useCurrentEditor();
  const count = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? countPagePins(e) : 0),
  });
  useEffect(() => {
    pagePinCount.set(count ?? 0);
    return () => pagePinCount.set(0);
  }, [count]);
  return null;
}

function PaneContent() {
  const { t } = useTranslation();
  const { onPinsOpenChanged } = useEditorLayoutActions();
  const counts = usePinCounts();
  const [chosen, setChosen] = useState<Tab>(readTab);
  // No Team tab outside a teamspace: This page instead.
  const tab: Tab = chosen === "team" && counts.team === null ? "page" : chosen;
  const close = () => onPinsOpenChanged(false);

  const choose = (next: Tab) => {
    setChosen(next);
    try {
      localStorage.setItem(TAB_KEY, next);
    } catch {
      /* storage blocked */
    }
  };

  const empty =
    tab === "page"
      ? counts.page === 0 && t("pins.pageEmpty")
      : tab === "mine"
        ? counts.mine === 0 && t("pins.mineEmpty")
        : counts.team === 0 && t("pins.teamEmpty");

  const tabs: { id: Tab; label: string; count: number | null }[] = [
    { id: "page", label: t("pins.tabs.page"), count: counts.page },
    { id: "mine", label: t("pins.tabs.mine"), count: counts.mine },
    { id: "team", label: t("pins.tabs.team"), count: counts.team },
  ];

  return (
    <aside
      className="pins-pane"
      aria-label={t("pins.panel")}
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      <header className="pins-pane__head">
        <MaterialIcon name="keep" size={18} filled />
        <span className="pins-pane__title">{t("pins.panel")}</span>
        <button
          type="button"
          className="pins-pane__close"
          onClick={close}
          aria-label={t("pins.close")}
          title={t("pins.close")}
        >
          <MaterialIcon name="close" size={18} />
        </button>
      </header>

      <div className="pin-tabs" role="tablist">
        {tabs.map(
          (item) =>
            item.count !== null && (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className="pin-tabs__tab"
                onClick={() => choose(item.id)}
              >
                {item.label}
                <span className="pin-tabs__count">{item.count}</span>
              </button>
            ),
        )}
      </div>

      {empty && <p className="pins-pane__empty">{empty}</p>}

      <div
        className="pins-pane__body"
        data-tab={tab}
        ref={(el) => {
          pinTargets.set("side", el);
          return () => pinTargets.set("side", null);
        }}
      />
    </aside>
  );
}
