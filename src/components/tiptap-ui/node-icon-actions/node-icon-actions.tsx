import { useSyncExternalStore } from "react";
import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";
import { useEditorState } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { Smile, SmilePlus, Square, X } from "src/components/icons";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { DropdownMenuItem } from "src/components/tiptap-ui-primitive/dropdown-menu";
import { IconPickerPopover } from "src/features/pages/cover";
import { getSelectedBlocks } from "src/lib/block-selection";
import { usePage } from "src/hooks/use-pages";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";

// Block-menu actions for nodes that carry an icon (callout for now):
// Add / Remove icon, Edit icon, and Add / Remove border for callouts.
//
// "Edit icon" opens the icon picker next to the icon inside the node. The
// menu closes right away, so the picker isn't drawn by the menu: the menu
// asks NodeIconPickerHost (mounted once, beside the drag handle) to open it.

/** Nodes with an icon, and how each one stores and shows it. */
const ICON_NODES: Record<
  string,
  { shownAttr: string; iconSelector: string; borderAttr?: string }
> = {
  callout: {
    shownAttr: "showIcon",
    iconSelector: ".callout-icon-btn",
    borderAttr: "bordered",
  },
  pageLink: {
    shownAttr: "showIcon",
    iconSelector: ".page-link-node .page-icon",
  },
};

// ── Which node the menu is for ─────────────────────────────────────────────

type Target = { node: PMNode; pos: number };

function menuTarget(editor: Editor): Target | null {
  const sel = editor.state.selection;
  const blocks = getSelectedBlocks(sel);
  const target =
    blocks?.length === 1
      ? blocks[0]
      : sel instanceof NodeSelection
        ? { node: sel.node, pos: sel.from }
        : null;
  if (!target || !ICON_NODES[target.node.type.name]) return null;
  return target;
}

function setAttr(editor: Editor, pos: number, name: string, value: unknown) {
  editor
    .chain()
    .command(({ tr }) => {
      tr.setNodeAttribute(pos, name, value);
      return true;
    })
    .run();
}

// ── The picker, opened from the menu ───────────────────────────────────────

type PickerRequest = { pos: number; anchor: HTMLElement } | null;

let request: PickerRequest = null;
const listeners = new Set<() => void>();
const pickerStore = {
  open(next: PickerRequest) {
    request = next;
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: (): PickerRequest => request,
};

/** Mount once next to the block menu (drag-handle.tsx). */
export function NodeIconPickerHost({ editor }: { editor: Editor | null }) {
  const current = useSyncExternalStore(
    pickerStore.subscribe,
    pickerStore.getSnapshot,
  );
  const node = editor && current ? editor.state.doc.nodeAt(current.pos) : null;

  // A page link shows its page's icon: load that page so the picker can
  // update the page itself (sidebar, header and other links follow).
  const linkedPageId =
    node?.type.name === "pageLink" ? (node.attrs.pageId as string) : null;
  const { data: linkedPage } = usePage(linkedPageId);
  const { mutate: patchPageMutate } = usePatchPage(({ id, patch }) =>
    patchPage(id, patch),
  );

  const config = node ? ICON_NODES[node.type.name] : undefined;
  if (!editor || !current || !node || !config) return null;

  const close = () => pickerStore.open(null);

  return (
    <IconPickerPopover
      open
      onOpenChange={(open) => !open && close()}
      anchorRef={{ current: current.anchor }}
      defaultTarget={
        (linkedPage ? linkedPage.cover.target : node.attrs.target) ?? "Emoji"
      }
      onSelect={(name, color, target) => {
        if (linkedPageId && linkedPage) {
          // Page link: change the linked page's icon.
          patchPageMutate({
            id: linkedPageId,
            patch: {
              cover: {
                ...linkedPage.cover,
                iconName: name,
                color: color ?? null,
                target: target ?? "Emoji",
              },
            },
          });
        } else {
          // Callout (and other nodes that keep their own icon).
          editor
            .chain()
            .command(({ tr }) => {
              tr.setNodeAttribute(current.pos, "iconName", name);
              tr.setNodeAttribute(current.pos, "color", color ?? null);
              tr.setNodeAttribute(current.pos, "target", target ?? "Emoji");
              return true;
            })
            .run();
        }
        close();
      }}
      onRemove={() => {
        // Hiding the icon is about this block only, so it stays on the node.
        setAttr(editor, current.pos, config.shownAttr, false);
        close();
      }}
    />
  );
}

// ── The menu items ─────────────────────────────────────────────────────────

function MenuButton({
  Icon,
  label,
  onClick,
}: {
  Icon: typeof Smile;
  label: string;
  onClick: () => void;
}) {
  return (
    <DropdownMenuItem asChild>
      <Button
        type="button"
        variant="ghost"
        className="menu-button"
        style={{ justifyContent: "flex-start", width: "100%" }}
        onClick={onClick}
      >
        <Icon className="tiptap-button-icon" />
        <span className="tiptap-button-text">{label}</span>
      </Button>
    </DropdownMenuItem>
  );
}

export function NodeIconActions({
  editor,
  onAction,
}: {
  editor: Editor;
  onAction?: () => void;
}) {
  const { t } = useTranslation();
  // Re-read when the selection or the node changes.
  const target = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? menuTarget(e) : null),
  });
  if (!target) return null;

  const { node, pos } = target;
  const config = ICON_NODES[node.type.name];
  const shown = node.attrs[config.shownAttr] !== false;
  const bordered = config.borderAttr ? !!node.attrs[config.borderAttr] : false;

  const editIcon = () => {
    const dom = editor.view.nodeDOM(pos);
    const anchor =
      dom instanceof HTMLElement
        ? dom.querySelector<HTMLElement>(config.iconSelector)
        : null;
    onAction?.();
    if (anchor) pickerStore.open({ pos, anchor });
  };

  return (
    <>
      <MenuButton
        Icon={shown ? X : SmilePlus}
        label={shown ? t("blockMenu.removeIcon") : t("blockMenu.addIcon")}
        onClick={() => {
          setAttr(editor, pos, config.shownAttr, !shown);
          onAction?.();
        }}
      />
      {shown && (
        <MenuButton
          Icon={Smile}
          label={t("blockMenu.editIcon")}
          onClick={editIcon}
        />
      )}
      {config.borderAttr && (
        <MenuButton
          Icon={Square}
          label={
            bordered ? t("blockMenu.removeBorder") : t("blockMenu.addBorder")
          }
          onClick={() => {
            setAttr(editor, pos, config.borderAttr!, !bordered);
            onAction?.();
          }}
        />
      )}
    </>
  );
}
