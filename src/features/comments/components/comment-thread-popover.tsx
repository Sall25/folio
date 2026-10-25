import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import type { Editor, JSONContent } from "@tiptap/core";
import { useTranslation } from "react-i18next";
import { ArrowUp } from "src/components/icons";
import { Avatar } from "src/components/tiptap-ui-primitive/avatar";
import type { ID } from "src/types";
import { useThreadsByPage } from "src/hooks/use-threads";
import { useCreateThread } from "src/hooks/use-create-thread";
import { useCreateComment } from "src/hooks/use-create-comment";
import { useCurrentPerson } from "src/hooks/use-session";
import { makeThread } from "src/utils/make-thread";
import { makeComment } from "src/utils/make-comment";
import { newId } from "src/lib/id";
import { useActivePageState } from "src/features/pages/context/active-page-context";
import { commentThreadPluginKey } from "../extensions";
import {
  clearCommentDraft,
  useCommentDraft,
  type CommentDraft,
} from "../draft-store";
import { CommentMentionEditor, type CommentEditorRef } from "../editor";
import { anchorText, useNotifyMentions } from "../utils";
import { ThreadConversation } from "./thread-conversation";
import "./comment-thread-popover.scss";

const POPOVER_WIDTH = 380;
const GAP = 6;
const EDGE = 8;
const MIN_SPACE_BELOW = 260;

// The thread opened by clicking a highlight. Remembers its page and when it
// was opened, so "which popover shows" is derived during render (no effects).
interface OpenThread {
  threadId: ID;
  pageId: ID;
  openedAt: number;
}

// Inline comments open in a popover under the commented text — click a
// highlight, or use the comment button on a selection (a local draft until
// the first comment is posted). No sidebar, no placement pass: the popover
// follows its anchor on scroll and edits.
//
// Mount once next to the editor.
export function CommentThreadPopover({ editor }: { editor: Editor | null }) {
  const { activePageId } = useActivePageState();
  const { data: threads = [] } = useThreadsByPage(activePageId);
  const draft = useCommentDraft();
  const [open, setOpen] = useState<OpenThread | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // ── What shows (derived) ────────────────────────────────────────────────
  // Only for the current page; a thread that no longer exists shows nothing;
  // the more recent of draft / clicked thread wins.
  const pageDraft = draft && draft.pageId === activePageId ? draft : null;
  const pageOpen = open && open.pageId === activePageId ? open : null;
  const thread = pageOpen
    ? (threads.find((t) => t.id === pageOpen.threadId) ?? null)
    : null;
  const showDraft =
    !!pageDraft &&
    (!thread || !pageOpen || pageDraft.createdAt > pageOpen.openedAt);
  const shownId = showDraft ? pageDraft!.threadId : (thread?.id ?? null);

  // The click handler reads the draft through a ref (no re-subscribe per draft).
  const pageDraftRef = useRef(pageDraft);
  useEffect(() => {
    pageDraftRef.current = pageDraft;
  }, [pageDraft]);

  // ── Open ────────────────────────────────────────────────────────────────
  // Click a commented span → open its thread.
  useEffect(() => {
    if (!editor || !activePageId) return;
    const onClick = (e: MouseEvent) => {
      const span = (e.target as HTMLElement).closest<HTMLElement>(
        "[data-thread-id]",
      );
      const threadId = span?.getAttribute("data-thread-id");
      if (!threadId) return;
      const current = pageDraftRef.current;
      if (current && threadId === current.threadId) return;
      if (current) clearCommentDraft();
      setOpen({ threadId, pageId: activePageId, openedAt: Date.now() });
      editor.view.dispatch(
        editor.state.tr.setMeta(commentThreadPluginKey, {
          type: "selectThread",
          threadId,
        }),
      );
    };
    const dom = editor.view.dom;
    dom.addEventListener("click", onClick);
    return () => dom.removeEventListener("click", onClick);
  }, [editor, activePageId]);

  // ── Close ───────────────────────────────────────────────────────────────
  const close = useCallback(() => {
    clearCommentDraft();
    if (open && editor && !editor.isDestroyed) {
      editor.view.dispatch(
        editor.state.tr.setMeta(commentThreadPluginKey, {
          type: "unselectThread",
          threadId: open.threadId,
        }),
      );
    }
    setOpen(null);
  }, [open, editor]);

  useEffect(() => {
    if (!shownId) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (popoverRef.current?.contains(target)) return;
      // Portaled menus (reaction picker, "more", mention list) count as inside.
      if (target.closest("[data-radix-popper-content-wrapper]")) return;
      if (target.closest(".mention-list")) return;
      // Another highlight: its click handler switches threads.
      if (target.closest("[data-thread-id]")) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) close();
    };
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("touchstart", onDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("touchstart", onDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [shownId, close]);

  // ── Position (written straight to the element, not React state) ─────────
  usePopoverPosition(editor, shownId, popoverRef);

  if (!editor || !shownId) return null;

  return createPortal(
    <div
      ref={popoverRef}
      className="comment-thread-popover"
      // Hidden until the first measurement places it.
      style={{ position: "fixed", visibility: "hidden", top: 0, left: 0 }}
      role="dialog"
    >
      {showDraft && pageDraft && pageDraft.kind === "suggestion" ? (
        <SuggestionDraftContent
          key={pageDraft.threadId}
          editor={editor}
          draft={pageDraft}
          onPosted={(id) =>
            setOpen({
              threadId: id,
              pageId: pageDraft.pageId,
              openedAt: Date.now(),
            })
          }
        />
      ) : showDraft && pageDraft ? (
        <DraftContent
          key={pageDraft.threadId}
          editor={editor}
          draft={pageDraft}
          onPosted={(id) =>
            setOpen({
              threadId: id,
              pageId: pageDraft.pageId,
              openedAt: Date.now(),
            })
          }
        />
      ) : thread ? (
        <ThreadConversation
          key={thread.id}
          editor={editor}
          thread={thread}
          onClose={close}
        />
      ) : null}
    </div>,
    document.body,
  );
}

// ── Live anchor → fixed position ──────────────────────────────────────────
// Reads the anchor from the plugin state (remapped on every edit), places
// the popover under it — or above when there's no room — and keeps it inside
// the viewport. Writes the element's style directly: positioning an element
// against the DOM is an external-system update, not React state. Re-runs on
// scroll, resize, editor transactions and the popover's own size changes.
function usePopoverPosition(
  editor: Editor | null,
  threadId: ID | null,
  popoverRef: RefObject<HTMLDivElement | null>,
) {
  useLayoutEffect(() => {
    const el = popoverRef.current;
    if (!editor || !threadId || !el) return;

    const place = () => {
      if (editor.isDestroyed) return;
      const state = commentThreadPluginKey.getState(editor.state);
      const anchor = state?.threads.find((t) => t.id === threadId)?.anchor;
      if (!anchor) {
        el.style.visibility = "hidden";
        return;
      }
      const size = editor.state.doc.content.size;
      const from = Math.max(1, Math.min(anchor.from, size));
      const to = Math.max(from, Math.min(anchor.to, size));
      let start: { top: number; bottom: number; left: number };
      let end: { top: number; bottom: number; left: number };
      try {
        start = editor.view.coordsAtPos(from);
        end = editor.view.coordsAtPos(to);
      } catch {
        return; // not renderable this frame — keep the last position
      }

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const width = Math.min(POPOVER_WIDTH, vw - EDGE * 2);
      const left = Math.min(Math.max(start.left, EDGE), vw - width - EDGE);
      const height = el.offsetHeight || MIN_SPACE_BELOW;
      const spaceBelow = vh - end.bottom - GAP - EDGE;
      const spaceAbove = start.top - GAP - EDGE;
      const placeAbove =
        spaceBelow < Math.min(height, MIN_SPACE_BELOW) &&
        spaceAbove > spaceBelow;

      el.style.left = `${left}px`;
      el.style.width = `${width}px`;
      if (placeAbove) {
        el.style.top = "auto";
        el.style.bottom = `${vh - start.top + GAP}px`;
        el.style.maxHeight = `${spaceAbove}px`;
      } else {
        el.style.bottom = "auto";
        el.style.top = `${end.bottom + GAP}px`;
        el.style.maxHeight = `${Math.max(spaceBelow, 160)}px`;
      }
      el.style.visibility = "visible";
    };

    place();

    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(place);
    };
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    editor.on("transaction", schedule);
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(schedule)
        : null;
    ro?.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      editor.off("transaction", schedule);
      ro?.disconnect();
    };
  }, [editor, threadId, popoverRef]);
}

// ── A new comment on a selection (not saved until posted) ─────────────────
function DraftContent({
  editor,
  draft,
  onPosted,
}: {
  editor: Editor;
  draft: CommentDraft;
  onPosted: (threadId: ID) => void;
}) {
  const { t } = useTranslation();
  const { person } = useCurrentPerson();
  const createThread = useCreateThread();
  const createComment = useCreateComment();
  const notifyMentions = useNotifyMentions();
  const editorRef = useRef<CommentEditorRef>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [posting, setPosting] = useState(false);
  const quote = anchorText(editor, draft.threadId);

  const submit = async (json: JSONContent) => {
    if (!person || posting) return;
    // The live (remapped) anchor, in case the text moved while writing.
    const live = commentThreadPluginKey
      .getState(editor.state)
      ?.threads.find((th) => th.id === draft.threadId)?.anchor ?? {
      from: draft.from,
      to: draft.to,
    };
    setPosting(true);
    try {
      await createThread.mutateAsync(
        makeThread({
          id: draft.threadId,
          pageId: draft.pageId,
          anchor: { from: live.from, to: live.to },
          status: "open",
        }),
      );
      const commentId = newId();
      createComment.mutate({
        comment: makeComment({
          id: commentId,
          threadId: draft.threadId,
          text: JSON.stringify(json),
          authorId: person.id,
        }),
        threadId: draft.threadId,
      });
      notifyMentions(json, commentId, draft.threadId);
      clearCommentDraft();
      onPosted(draft.threadId);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="ctp">
      {quote && <div className="ctp__quote">{quote}</div>}
      <div className="ctp__composer">
        <Avatar
          size="sm"
          src={person?.avatarUrl ?? undefined}
          name={person?.name ?? ""}
        />
        <CommentMentionEditor
          ref={editorRef}
          autoFocus
          placeholder={t("comments.addComment", "Add a comment…")}
          onSubmit={(json) => void submit(json)}
          onEmptyChange={setIsEmpty}
        />
        <button
          type="button"
          className="ctp__send"
          aria-label={t("comments.send", "Send")}
          disabled={isEmpty || posting}
          onClick={() => editorRef.current?.submit()}
        >
          <ArrowUp size={15} />
        </button>
      </div>
    </div>
  );
}

// ── A suggested replacement for a selection (not saved until posted) ──────
// The new text starts as the selected text, so you edit it in place; the
// note is optional. Posting creates a thread carrying the suggestion.
function SuggestionDraftContent({
  editor,
  draft,
  onPosted,
}: {
  editor: Editor;
  draft: CommentDraft;
  onPosted: (threadId: ID) => void;
}) {
  const { t } = useTranslation();
  const { person } = useCurrentPerson();
  const createThread = useCreateThread();
  const createComment = useCreateComment();
  const notifyMentions = useNotifyMentions();
  const noteRef = useRef<CommentEditorRef>(null);
  const [noteEmpty, setNoteEmpty] = useState(true);
  const [posting, setPosting] = useState(false);
  // The text as it was when the suggestion started (read once, on mount).
  const [original] = useState(() =>
    anchorText(editor, draft.threadId, { from: draft.from, to: draft.to }),
  );
  const [text, setText] = useState(original);
  // One line of text: newlines would land as raw characters in the paragraph.
  const proposed = text.replace(/\s*\n\s*/g, " ");
  const changed = proposed.trim() !== original.trim();

  const submit = async (note: JSONContent | null) => {
    if (!person || posting || !changed) return;
    const live = commentThreadPluginKey
      .getState(editor.state)
      ?.threads.find((th) => th.id === draft.threadId)?.anchor ?? {
      from: draft.from,
      to: draft.to,
    };
    setPosting(true);
    try {
      await createThread.mutateAsync(
        makeThread({
          id: draft.threadId,
          pageId: draft.pageId,
          anchor: { from: live.from, to: live.to },
          status: "open",
          suggestion: { original, text: proposed, state: "pending" },
        }),
      );
      // The first comment carries the author (and the optional note).
      const commentId = newId();
      createComment.mutate({
        comment: makeComment({
          id: commentId,
          threadId: draft.threadId,
          text: note ? JSON.stringify(note) : "",
          authorId: person.id,
        }),
        threadId: draft.threadId,
      });
      if (note) notifyMentions(note, commentId, draft.threadId);
      clearCommentDraft();
      onPosted(draft.threadId);
    } finally {
      setPosting(false);
    }
  };

  // With a note, let the note editor hand over its JSON; without, post now.
  const send = () => {
    if (noteEmpty) void submit(null);
    else noteRef.current?.submit();
  };

  return (
    <div className="ctp">
      <div className="ctp__suggest-label">
        {t("comments.suggestEdit", "Suggest an edit")}
      </div>
      {original && <div className="ctp__suggest-old">{original}</div>}
      <textarea
        className="ctp__suggest-input"
        autoFocus
        rows={2}
        value={text}
        placeholder={t("comments.suggestPlaceholder", "Replace with…")}
        onChange={(e) => setText(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
      />
      <div className="ctp__composer">
        <Avatar
          size="sm"
          src={person?.avatarUrl ?? undefined}
          name={person?.name ?? ""}
        />
        <CommentMentionEditor
          ref={noteRef}
          placeholder={t("comments.suggestNote", "Add a note (optional)…")}
          onSubmit={(json) => void submit(json)}
          onEmptyChange={setNoteEmpty}
        />
        <button
          type="button"
          className="ctp__send"
          aria-label={t("comments.send", "Send")}
          disabled={!changed || posting}
          onClick={send}
        >
          <ArrowUp size={15} />
        </button>
      </div>
    </div>
  );
}
