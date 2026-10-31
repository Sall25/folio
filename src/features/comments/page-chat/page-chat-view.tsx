import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/core";
import { useCurrentEditor } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { ArrowUp, MaterialIcon, MessageSquareText } from "src/components/icons";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { usePageViewActions } from "src/features/pages/context/page-view-context";
import {
  useEditorLayoutState,
  useEditorLayoutTransient,
} from "src/features/shell/context/editor-layout-context";
import { useLayoutMode } from "src/features/shell/hooks/use-layout-mode";
import { calculateSidebarWidth } from "src/lib/utils";
import { focusThreadInPeek } from "./peek-thread-focus";
import type { ID, Thread } from "src/types";
import { useOptionalActivePage } from "src/features/pages/context/active-page-context";
import { useCreateThread } from "src/hooks/use-create-thread";
import { useCreateComment } from "src/hooks/use-create-comment";
import { useCurrentPerson } from "src/hooks/use-session";
import { makeThread } from "src/utils/make-thread";
import { makeComment } from "src/utils/make-comment";
import { ThreadConversation } from "../components/thread-conversation";
import { CommentMentionEditor, type CommentEditorRef } from "../editor";
import { scrollToAnchor } from "../scroll-to-thread";
import { pageTabs, usePageTab } from "./page-tab-store";
import { useChatThreads } from "./use-chat-threads";
import "./page-chat.scss";

// The page's comment threads as one chat (the Chat tab): oldest at the top,
// newest at the bottom. Each thread is the same conversation as in the
// comment popover and the comments pane — replies, reactions, resolve,
// suggestions with Accept — so replying here replies in the thread. A
// thread on a piece of the page opens the page at its text: in the side
// peek or the centre peek (the chat stays), or the full page (with a "Back
// to chat" button). The box at the bottom starts a comment on the whole
// page.
//
// Mounted in the page area (page-editor-layout.tsx), only on the Chat tab;
// the page's editor stays mounted underneath, hidden.

export function PageChatView() {
  const { activePageId } = useOptionalActivePage();
  const { tab } = usePageTab(activePageId);
  if (!activePageId || tab !== "chat") return null;
  return <ChatBody key={activePageId} pageId={activePageId} />;
}

function ChatBody({ pageId }: { pageId: ID }) {
  const { t } = useTranslation();
  const { editor } = useCurrentEditor();
  const threads = useChatThreads(pageId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { setTarget } = usePageViewActions();

  // The page area runs under the sidebar: centre the chat in what's left
  // of it, not in the whole window.
  const { collapsed } = useEditorLayoutState();
  const { expandedWidth } = useEditorLayoutTransient();
  const { mode, isMobile } = useLayoutMode();
  const sidebarWidth = isMobile
    ? 0
    : calculateSidebarWidth(mode, collapsed, expandedWidth);

  // Open where you left it (coming back from the page), else at the bottom.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const saved = pageTabs.get(pageId).chatScroll;
    el.scrollTop = saved >= 0 ? saved : el.scrollHeight;
  }, [pageId]);

  // A new message at the bottom while you're near it: follow it down.
  const count = threads.length;
  const [seen, setSeen] = useState(count);
  if (count !== seen) setSeen(count);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      el.scrollTop = el.scrollHeight;
    }
  }, [seen]);

  const peek = (thread: Thread, view: "Peek" | "Center") => {
    focusThreadInPeek(pageId, thread);
    setTarget({ pageId, view });
  };

  const seeInPage = (thread: Thread) => {
    const el = scrollRef.current;
    pageTabs.set(pageId, {
      tab: "page",
      backToChat: true,
      chatScroll: el ? el.scrollTop : -1,
    });
    // The page is shown again on the next frame; scroll once it's laid out.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (editor) scrollToAnchor(editor, thread);
      }),
    );
  };

  return (
    <section
      className="page-chat"
      aria-label={t("pageChat.chat")}
      style={{ paddingLeft: sidebarWidth }}
    >
      <div ref={scrollRef} className="page-chat__scroll">
        <div className="page-chat__list">
          {threads.length === 0 ? (
            <div className="page-chat__empty">
              <MessageSquareText size={28} strokeWidth={1.5} />
              <p>{t("pageChat.empty")}</p>
            </div>
          ) : (
            threads.map((thread) => (
              <article key={thread.id} className="page-chat__thread">
                <header className="page-chat__thread-head">
                  <span>
                    {thread.anchor
                      ? t("pageChat.onText")
                      : t("pageChat.onPage")}
                  </span>
                  {thread.status === "resolved" && (
                    <span className="page-chat__resolved">
                      {t("pageChat.resolved")}
                    </span>
                  )}
                  {thread.anchor && (
                    <div
                      className="page-chat__open"
                      role="group"
                      aria-label={t("pageChat.seeInPage")}
                    >
                      <span className="page-chat__open-label">
                        {t("pageChat.seeInPage")}
                      </span>
                      <Button
                        variant="ghost"
                        className="page-chat__open-btn"
                        aria-label={t("pageChat.openSide")}
                        tooltip={t("pageChat.openSide")}
                        onClick={() => peek(thread, "Peek")}
                      >
                        <MaterialIcon
                          name="right_panel_open"
                          size={16}
                          className="tiptap-button-icon"
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        className="page-chat__open-btn"
                        aria-label={t("pageChat.openCenter")}
                        tooltip={t("pageChat.openCenter")}
                        onClick={() => peek(thread, "Center")}
                      >
                        <MaterialIcon
                          name="pip"
                          size={16}
                          className="tiptap-button-icon"
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        className="page-chat__open-btn"
                        aria-label={t("pageChat.openPage")}
                        tooltip={t("pageChat.openPage")}
                        onClick={() => seeInPage(thread)}
                      >
                        <MaterialIcon
                          name="open_in_full"
                          size={16}
                          className="tiptap-button-icon"
                        />
                      </Button>
                    </div>
                  )}
                </header>
                <ThreadConversation editor={editor} thread={thread} />
              </article>
            ))
          )}
        </div>
      </div>
      <PageChatComposer pageId={pageId} />
    </section>
  );
}

/** A new comment on the whole page (a thread without an anchor). */
function PageChatComposer({ pageId }: { pageId: ID }) {
  const { t } = useTranslation();
  const { person } = useCurrentPerson();
  const createThread = useCreateThread();
  const createComment = useCreateComment();
  const editorRef = useRef<CommentEditorRef>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const submit = async (json: JSONContent) => {
    if (!person) return;
    const thread = makeThread({ pageId, anchor: null, status: "open" });
    await createThread.mutateAsync(thread);
    createComment.mutate({
      comment: makeComment({
        threadId: thread.id,
        text: JSON.stringify(json),
        authorId: person.id,
      }),
      threadId: thread.id,
    });
    editorRef.current?.clear();
  };

  return (
    <div className="page-chat__composer">
      <div className="page-chat__field">
        <CommentMentionEditor
          ref={editorRef}
          placeholder={t("pageChat.placeholder")}
          onSubmit={submit}
          onEmptyChange={setIsEmpty}
        />
        <button
          type="button"
          className="page-chat__send"
          aria-label={t("comments.send", "Send")}
          disabled={isEmpty}
          onClick={() => editorRef.current?.submit()}
        >
          <ArrowUp size={15} />
        </button>
      </div>
    </div>
  );
}

/** On the page, after "See in page": back to the chat where you were. */
export function BackToChat() {
  const { t } = useTranslation();
  const { activePageId } = useOptionalActivePage();
  const { tab, backToChat, setTab } = usePageTab(activePageId);
  if (!activePageId || tab !== "page" || !backToChat) return null;
  return (
    <button
      type="button"
      className="page-chat-back"
      onClick={() => setTab("chat")}
    >
      <MessageSquareText size={15} />
      {t("pageChat.back")}
    </button>
  );
}
