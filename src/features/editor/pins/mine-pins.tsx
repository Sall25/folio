import { useMemo, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { Editor } from "@tiptap/core";
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
import { findBlock, findLive } from "./pin-blocks";

// The cards for pins across pages (the pins table, migration 048) in the
// pins pane: "Mine" are yours, on every page; "Team" belong to the open
// page's teamspace, for all its members. The pane (pins-pane.tsx) shows one
// tab's cards at a time.
//
// A pin's block is read from its page's saved content by block id. On the
// page it comes from, the live block is used instead (interactive, like a
// "this page" pin). Its grip drags it into the page (pin-drop.ts).

export function MinePins() {
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
      {mine.map((pin, i) => (
        <PinCard
          key={pin.id}
          editor={editor}
          pin={pin}
          order={10_000 + i}
          className="is-mine"
        />
      ))}
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
      drag={() =>
        node
          ? { pageId: pin.pageId, blockId: pin.blockId, node: node.toJSON() }
          : null
      }
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
