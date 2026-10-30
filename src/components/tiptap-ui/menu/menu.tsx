import {
  Card,
  CardGroupLabel,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { Columns2, MessagesSquare, Search } from "src/components/icons";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import ColorDropdownMenu from "src/components/tiptap-ui/color-dropdown-menu";
import AlignmentDropdownMenu from "src/components/tiptap-ui/alignment-dropdown-menu";
import { TurnIntoDropdown } from "src/components/tiptap-ui/turn-into-dropdown";
import ResetFormattingButton from "src/components/tiptap-ui/reset-formatting-button";
import { DuplicateButton } from "src/components/tiptap-ui/duplicate-button";
import { CopyToClipboardButton } from "src/components/tiptap-ui/copy-to-clipboard-button";
import { CopyAnchorLinkButton } from "src/components/tiptap-ui/copy-anchor-link-button";
import { DeleteNodeButton } from "src/components/tiptap-ui/delete-node-button";

import "./menu.scss";
import { DropdownMenuItem } from "src/components/tiptap-ui-primitive/dropdown-menu";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Input } from "src/components/tiptap-ui-primitive/input";
import { CommentButton } from "../../../features/comments/comment-button";
import { useTranslation } from "react-i18next";
//import { RecordDragMenu } from "src/features/database/components/record-drag-menu";
import { useOptionalActivePage } from "src/features/pages/context/active-page-context";
import { requestDiscussBlock } from "src/features/chat/block-share-store";
import { SuggestButton } from "../../../features/comments/suggest-button";
import { MoveToDropdown } from "src/components/tiptap-ui/move-to-dropdown";
import { DatabasePageToggle } from "src/components/tiptap-ui/database-page-toggle/database-page-toggle";
import {
  countSelectedBlocks,
  getSelectedBlocks,
} from "src/lib/block-selection";
import { PinMenuActions } from "src/features/editor/pins";
import { BlockRefMenuActions } from "src/components/tiptap-node/block-ref-node";
import { NodeIconActions } from "src/components/tiptap-ui/node-icon-actions/node-icon-actions";
import {
  PomodoroMenuActions,
  isPomodoroMenu,
} from "src/components/tiptap-node/pomodoro-node";

const SNAPSHOT_MAX = 600;

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

// The list scrolls under the pinned search. Its edges fade (menu.scss) while
// there's more to scroll that way: data-scrolled for the top, data-more for
// the bottom. Set on the element directly, so scrolling doesn't re-render.
function updateFog(el: HTMLElement) {
  el.toggleAttribute("data-scrolled", el.scrollTop > 1);
  el.toggleAttribute(
    "data-more",
    el.scrollTop + el.clientHeight < el.scrollHeight - 1,
  );
}

const firstVisibleItem = (card: HTMLElement | null) =>
  Array.from(
    card?.querySelectorAll<HTMLElement>(
      '.group [role="menuitem"], .group button',
    ) ?? [],
  ).find((el) => el.offsetParent !== null) ?? null;

// The block the drag handle selected is a columns block, or sits inside one:
// offer to unwrap the columns. Read when the menu opens (it renders on
// open), so no editor listener is needed.
function isColumnsBlock(editor: Editor): boolean {
  const { selection } = editor.state;
  if (
    selection instanceof NodeSelection &&
    selection.node.type.name === "columnBlock"
  ) {
    return true;
  }
  // A block selection: only when it's that one columns block.
  const blocks = getSelectedBlocks(selection);
  if (blocks) {
    return blocks.length === 1 && blocks[0].node.type.name === "columnBlock";
  }
  const { $from } = selection;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === "columnBlock") return true;
  }
  return false;
}

// The block the drag handle selected — the node itself when it's a node
// selection, else the nearest ancestor. Only blocks with a UniqueID id can be
// shared (the id is what lets the chat jump back to it).
function getSelectedBlock(editor: Editor): { id: string; text: string } | null {
  const { selection } = editor.state;
  if (selection instanceof NodeSelection) {
    const id = selection.node.attrs?.id as string | undefined;
    if (id) return { id, text: selection.node.textContent };
  }
  // A block selection: shared when it's one block (a discussion points at
  // one block).
  const blocks = getSelectedBlocks(selection);
  if (blocks) {
    const node = blocks.length === 1 ? blocks[0].node : null;
    const id = node?.attrs?.id as string | undefined;
    return node && id ? { id, text: node.textContent } : null;
  }
  const { $from } = selection;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    const id = node.attrs?.id as string | undefined;
    if (id) return { id, text: node.textContent };
  }
  return null;
}

export function Menu({
  title,
  editor,
  onAction,
  // target,
}: {
  title: string;
  editor: Editor;
  onAction?: () => void;
  /** NODE_LABELS value from the drag handle (e.g. "Record" for a
   *  databaseRecord row). Selects which menu to show. */
  target?: string;
}) {
  const { t } = useTranslation();
  // Optional: the block menu also opens on the landing, where there's no
  // page — comment, suggest and discuss need one, so they hide there.
  const { activePageId, activePage } = useOptionalActivePage();

  // if (target === "Record") {
  //   return <RecordDragMenu onAction={onAction} />;
  // }

  const block = activePageId ? getSelectedBlock(editor) : null;
  // Opened on a selection of several blocks (drag-box, Shift+click on
  // grips): every action applies to all of them; the ones made for a
  // single block (suggest an edit, copy its link) are left out.
  const blockCount = countSelectedBlocks(editor.state.selection);
  const several = blockCount > 1;
  // A Pomodoro block: its own rows first; text-only actions are left out.
  const pomodoro = !several && isPomodoroMenu(editor);

  // Search actions (pinned above the list): the rows whose text doesn't
  // match are hidden (by their
  // own visible text, so every row is covered, dropdowns included), along
  // with groups left empty and the separators.
  const cardRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emptyRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");

  // The menu focuses itself on open; put the cursor in the search instead.
  useEffect(() => {
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, []);

  // Fog: on scroll, and whenever the list changes height (search, rows
  // appearing).
  useLayoutEffect(() => {
    const el = scrollRef.current;
    const list = listRef.current;
    if (!el || !list) return;
    const update = () => updateFog(el);
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    observer.observe(list);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    const card = listRef.current;
    if (!card) return;
    const q = normalize(query.trim());
    let any = false;
    card.querySelectorAll<HTMLElement>(":scope > .group").forEach((group) => {
      let groupAny = false;
      for (const row of Array.from(group.children) as HTMLElement[]) {
        // The item's label, not its shortcut badge ("Ctrl+D" shouldn't
        // match "ctrl").
        let label = row.textContent ?? "";
        row.querySelectorAll(".tiptap-badge").forEach((badge) => {
          label = label.replace(badge.textContent ?? "", "");
        });
        const match = !q || normalize(label).includes(q);
        row.style.display = match ? "" : "none";
        if (match) groupAny = true;
      }
      group.style.display = groupAny ? "" : "none";
      if (groupAny) any = true;
    });
    if (emptyRef.current) emptyRef.current.hidden = any;
    // A new search starts from the top.
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [query]);

  return (
    <Card
      ref={cardRef}
      className="menu"
      data-searching={query.trim() ? "" : undefined}
    >
      <div className="menu-search">
        <Search size={14} aria-hidden className="menu-search__icon" />
        <Input
          ref={inputRef}
          className="menu-search__input"
          value={query}
          placeholder={t("blockMenu.search")}
          aria-label={t("blockMenu.search")}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Escape closes the menu (the menu listens for it).
            if (e.key === "Escape") return;
            // Keep the menu's type-ahead out of the search.
            e.stopPropagation();
            if (e.key === "ArrowDown") {
              e.preventDefault();
              firstVisibleItem(cardRef.current)?.focus();
            } else if (e.key === "Enter" && query.trim()) {
              e.preventDefault();
              firstVisibleItem(cardRef.current)?.click();
            }
          }}
        />
      </div>
      <div ref={scrollRef} className="menu-scroll">
        <div ref={listRef} className="menu-list">
          <div ref={emptyRef} className="menu-empty" hidden>
            {t("blockMenu.noResults")}
          </div>
          <CardGroupLabel className="title">
            {several
              ? t("blockMenu.blocksSelected", { count: blockCount })
              : title}
          </CardGroupLabel>
          {pomodoro && (
            <>
              <CardItemGroup className="group" orientation="vertical">
                <PomodoroMenuActions editor={editor} onAction={onAction} />
              </CardItemGroup>
              <Separator orientation="horizontal" />
            </>
          )}
          <CardItemGroup className="group" orientation="vertical">
            <NodeIconActions editor={editor} onAction={onAction} />
            {!several && <PinMenuActions editor={editor} onAction={onAction} />}
            {!several && (
              <BlockRefMenuActions editor={editor} onAction={onAction} />
            )}
            {!pomodoro && (
              <DropdownMenuItem asChild>
                <ColorDropdownMenu
                  flyout
                  className="menu-button"
                  hideWhenUnavailable={true}
                  editor={editor}
                  onAction={onAction}
                />
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <AlignmentDropdownMenu
                flyout
                className="menu-button"
                hideWhenUnavailable={true}
                editor={editor}
                onAction={onAction}
              />
            </DropdownMenuItem>
            {!pomodoro && (
              <DropdownMenuItem asChild>
                <TurnIntoDropdown hideWhenUnavailable={true} editor={editor} />
              </DropdownMenuItem>
            )}
            {!several && (
              <DatabasePageToggle editor={editor} onAction={onAction} />
            )}
            {isColumnsBlock(editor) && (
              <DropdownMenuItem asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="menu-button"
                  style={{ justifyContent: "flex-start", width: "100%" }}
                  onClick={() => {
                    editor.chain().focus().unwrapColumns().run();
                    onAction?.();
                  }}
                >
                  <Columns2 className="tiptap-button-icon" />
                  <span className="tiptap-button-text">
                    {t("blockMenu.unwrapColumns", "Unwrap columns")}
                  </span>
                </Button>
              </DropdownMenuItem>
            )}
            {activePageId && (
              <DropdownMenuItem asChild>
                <MoveToDropdown editor={editor} onAction={onAction} />
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <ResetFormattingButton
                text={t("blockMenu.resetFormatting")}
                hideWhenUnavailable={true}
                editor={editor}
                onResetAllFormatting={onAction}
              />
            </DropdownMenuItem>
            {activePageId && (
              <>
                <DropdownMenuItem asChild>
                  <CommentButton
                    style={{
                      justifyContent: "flex-start",
                    }}
                    showTooltip={false}
                    text="Comment"
                    editor={editor}
                    onClick={onAction}
                  />
                </DropdownMenuItem>
                {!several && (
                  <DropdownMenuItem asChild>
                    <SuggestButton
                      style={{
                        justifyContent: "flex-start",
                      }}
                      showTooltip={false}
                      text="Suggest"
                      editor={editor}
                      onClick={onAction}
                    />
                  </DropdownMenuItem>
                )}
              </>
            )}
            {block && activePageId && (
              <DropdownMenuItem asChild>
                <Button
                  type="button"
                  variant="ghost"
                  style={{ justifyContent: "flex-start", width: "100%" }}
                  onClick={() => {
                    const text = block.text.trim().replace(/\s+/g, " ");
                    requestDiscussBlock({
                      pageId: activePageId,
                      blockId: block.id,
                      snapshot:
                        text.length > SNAPSHOT_MAX
                          ? `${text.slice(0, SNAPSHOT_MAX)}…`
                          : text,
                      pageTitle: activePage?.title ?? "",
                    });
                    onAction?.();
                  }}
                >
                  <MessagesSquare className="tiptap-button-icon" />
                  <span className="tiptap-button-text">
                    {t("blockMenu.discussInChat", "Discuss in chat…")}
                  </span>
                </Button>
              </DropdownMenuItem>
            )}
          </CardItemGroup>
          <Separator orientation="horizontal" />
          <CardItemGroup className="group" orientation="vertical">
            <DuplicateButton
              text={t("blockMenu.duplicateNode")}
              showShortcut={true}
              hideWhenUnavailable={false}
              editor={editor}
              onDuplicated={onAction}
            />
            <CopyToClipboardButton
              text={t("blockMenu.copyToClipboard")}
              showShortcut={true}
              hideWhenUnavailable={true}
              editor={editor}
              onCopied={onAction}
            />
            {!several && (
              <CopyAnchorLinkButton
                text={t("blockMenu.copyAnchorLink")}
                showShortcut={true}
                hideWhenUnavailable={false}
                editor={editor}
                onCopied={onAction}
              />
            )}
          </CardItemGroup>
          <Separator orientation="horizontal" />

          <CardItemGroup className="group" orientation="vertical">
            <DeleteNodeButton
              showTooltip={false}
              showShortcut={true}
              text={t("blockMenu.deleteNode")}
              onDeleted={onAction}
              className="delete-node-button"
            />
          </CardItemGroup>
        </div>
      </div>
    </Card>
  );
}
