import { usePeekCollab } from "../editor/hooks/use-peek-collab";
import { useSyncDocTitle } from "../editor/utils/doc-title";
import { usePageCapabilities } from "src/hooks/use-page-role";
import type { Page } from "src/types";
import { Editor, useEditor, type Extensions } from "@tiptap/react";
import { Card, CardBody } from "src/components/tiptap-ui-primitive/card";
import { EditorContent } from "@tiptap/react";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Target } from "src/features/pages/cover/types";
import { FloatingMenu } from "@tiptap/react/menus";
import { FloatingActions } from "../shell/floating-actions";
import { CoverHeader } from "src/features/pages/cover";
import { useRecordPropertyPanel } from "../database/record-property-panel/use-record-property-panel";
import { type Transaction } from "@tiptap/pm/state";
import { PeekEditorProvider } from "../editor/context/peek-editor-provider";
import { useDebouncedCallback } from "use-debounce";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";
import { usePageViewState } from "./context/page-view-context";
import { usePage } from "src/hooks/use-pages";
import { useLocalStorage } from "../../hooks/use-local-storage";
import "./page-peek-view.scss";
import { PeekToolbar } from "./peek-toolbar";
import { PageBodySkeleton } from "./page-body-skeleton";
import { usePageComment } from "../comments/page-comment-node/use-page-comment";
import { useMentionData } from "src/components/tiptap-ui/mention-menu/use-mention-data";

const FloatingMenuMemo = React.memo(function FloatingMenuMemo({
  open,
  setOpen,
  target,
  setTarget,
  onSelectAsync,
  onAddCoverAsync,
  floatingRef,
  editor,
  page,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  target: Target;
  setTarget: (v: Target) => void;
  onSelectAsync: (value: string) => Promise<void>;
  onAddCoverAsync: () => Promise<void>;
  floatingRef: React.RefObject<HTMLDivElement | null>;
  editor: Editor | null;
  page?: Page;
}) {
  return (
    <FloatingMenu
      editor={editor}
      shouldShow={() => !!editor?.isActive("title")}
      options={{
        placement: "top",
        onShow() {
          floatingRef.current?.classList.remove("floating-hide");
          floatingRef.current?.classList.add("floating-show");
        },
        onHide() {
          floatingRef.current?.classList.remove("floating-show");
          floatingRef.current?.classList.add("floating-hide");
        },
      }}
    >
      <div ref={floatingRef}>
        <FloatingActions
          open={open}
          onOpenChange={setOpen}
          target={target}
          onTargetChange={setTarget}
          onSelect={onSelectAsync}
          onAddCoverAsync={onAddCoverAsync}
          providedPage={page}
        />
      </div>
    </FloatingMenu>
  );
});

function getTitleChange(
  editor: Editor,
  transaction: Transaction,
): { changed: boolean; text: string | null } {
  if (!transaction.docChanged) return { changed: false, text: null };
  const { $from } = editor.state.selection;
  const node = $from.node();
  if (node.type.name === "title") {
    return { changed: true, text: node.textContent };
  }
  return { changed: false, text: null };
}

// ── Gate ──────────────────────────────────────────────────────────────────────
// The editor opens the page's live (Yjs) document, like the full page — so
// edits made here are the same edits everyone sees, and nothing is lost when
// the page is opened full-size. It's created only once that document has
// synced (or opened from the offline copy); keying by page.id gives each
// peeked page its own editor.
//
// The panel itself opens at once: its frame (toolbar, width) stays mounted
// from the click on, the cover and title show as soon as the page is known,
// and the body is a skeleton until the editor is ready (page-body-skeleton).
export function PagePeekView({ onClose }: { onClose?: () => void }) {
  const { target: viewTarget } = usePageViewState();
  const pageId = viewTarget?.pageId ?? null;
  const { data: page } = usePage(pageId);

  return (
    <PeekFrame pageId={pageId} page={page ?? null} onClose={onClose}>
      {page ? (
        <PagePeekCollab key={page.id} page={page} />
      ) : (
        <div>
          <PageBodySkeleton page={null} contentClassName="page-peek-content" />
        </div>
      )}
    </PeekFrame>
  );
}

// ── Frame ─────────────────────────────────────────────────────────────────────
// The panel, its resize handle and its toolbar — everything that doesn't need
// the editor, so it can show before the editor exists.
const PEEK_MIN = 380;
const PEEK_DEFAULT = 480; // ← set to your current .page-peek width

/** The open side view's width, on <html> as --peek-width; null removes it. */
function setPeekWidthVar(width: number | null) {
  const root = document.documentElement.style;
  if (width == null) root.removeProperty("--peek-width");
  else root.setProperty("--peek-width", `${width}px`);
}

const clampWidth = (w: number) =>
  Math.min(Math.max(w, PEEK_MIN), Math.round(window.innerWidth * 0.9));

function PeekFrame({
  pageId,
  page,
  onClose,
  children,
}: {
  pageId: string | null;
  page: Page | null;
  onClose?: () => void;
  children: ReactNode;
}) {
  // ── Resize ────────────────────────────────────────────────────────────────
  // Left-edge drag handle widens/narrows the right-anchored peek. Width persists
  // via useLocalStorage. During the drag we write straight to the card's DOM (no
  // per-move re-render — the live editor would stutter otherwise) and commit the
  // final width to storage on release.
  const [width, setWidth] = useLocalStorage<number>("peek-width", PEEK_DEFAULT);

  const cardRef = useRef<HTMLDivElement | null>(null);
  const resizingRef = useRef(false);
  const liveWidthRef = useRef(width);

  const onResizeStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onResizeMove = useCallback((e: React.PointerEvent) => {
    if (!resizingRef.current || !cardRef.current) return;
    // Right-anchored: width = distance from pointer to the viewport's right edge.
    const next = clampWidth(window.innerWidth - e.clientX);
    liveWidthRef.current = next;
    cardRef.current.style.width = `${next}px`; // DOM only — no re-render
    setPeekWidthVar(next);
  }, []);

  const onResizeEnd = useCallback(
    (e: React.PointerEvent) => {
      if (!resizingRef.current) return;
      resizingRef.current = false;
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      setWidth(liveWidthRef.current); // commit once — persists + re-renders
    },
    [setWidth],
  );

  // The page behind makes room for the panel (peek-toolbar.scss reads it).
  useLayoutEffect(() => {
    setPeekWidthVar(width);
  }, [width]);
  useLayoutEffect(() => () => setPeekWidthVar(null), []);

  return (
    <Card
      ref={cardRef}
      className="page-peek"
      style={{
        position: "fixed",
        borderRadius: 0,
        top: 0,
        bottom: 0,
        right: 0,
        width,
        border: "1px solid var(--tt-border-color)",
        boxShadow: "var(--tt-shadow-elevated-md)",
      }}
    >
      {/* Left-edge resize handle */}
      <div
        className="page-peek__resize"
        onPointerDown={onResizeStart}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeEnd}
        onPointerCancel={onResizeEnd}
      />

      <PeekToolbar mode="Peek" pageId={pageId} page={page} onClose={onClose} />
      <CardBody style={{ width: "100%" }}>{children}</CardBody>
    </Card>
  );
}

// ── Page (known): cover at once, body once the live document is ready ────────
function PagePeekCollab({ page }: { page: Page }) {
  const { extensions, ready } = usePeekCollab(page);
  return (
    <>
      <CoverHeader
        collapsed={false}
        sidebarWidth={0}
        paddingLeft={0}
        translateX={0}
        hasThreads={false}
        providedPage={page}
        marginLeft={0}
      />
      {ready && extensions ? (
        <PagePeekEditor page={page} extensions={extensions} />
      ) : (
        <div>
          <PageBodySkeleton page={page} contentClassName="page-peek-content" />
        </div>
      )}
    </>
  );
}

// ── Editor (only mounts once the live document is ready) ───────────────────────
function PagePeekEditor({
  page,
  extensions,
}: {
  page: Page;
  extensions: Extensions;
}) {
  const { mutateAsync } = usePatchPage(({ id, patch }) => patchPage(id, patch));

  const floatingRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Target>("Emoji");

  const pageRef = useRef(page);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  // No `content`: Collaboration reads it from the live document.
  const editor = useEditor({
    extensions,
    autofocus: "start",
  });
  // What the @ menu offers, ready before its first open.
  useMentionData(editor);

  // Read-only for people who can only view or comment.
  const { canEditContent, isLoading: roleLoading } = usePageCapabilities(
    page.id,
  );
  useEffect(() => {
    editor?.setEditable(canEditContent && !roleLoading);
  }, [editor, canEditContent, roleLoading]);

  // Renamed elsewhere (the sidebar) since it was last open → title block too.
  useSyncDocTitle(editor, page, canEditContent, roleLoading);

  const onSelectAsync = useCallback(
    async (name: string, color?: string) => {
      setOpen(false);
      if (!pageRef.current) return;
      await mutateAsync({
        id: pageRef.current.id,
        patch: {
          cover: {
            ...pageRef.current.cover,
            iconName: name,
            target,
            color: color ?? null,
          },
        },
      });
    },
    [target, mutateAsync],
  );

  const onAddCoverAsync = useCallback(async () => {
    if (!pageRef.current) return;
    await mutateAsync({
      id: pageRef.current.id,
      patch: {
        cover: {
          ...pageRef.current.cover,
          coverImage: "/covers/default-cover.jpg",
        },
      },
    });
  }, [mutateAsync]);

  // Autosave — the TITLE only (it's also a column, for lists and search).
  // The content saves itself through the live document.
  const latestTitleRef = useRef<string | null>(null);
  const saveActivePage = useDebouncedCallback(
    () => {
      const p = pageRef.current;
      const title = latestTitleRef.current;
      if (!p || title == null) return;
      latestTitleRef.current = null;
      mutateAsync({ id: p.id, patch: { title, updatedAt: Date.now() } });
    },
    800,
    { maxWait: 2500 },
  );

  const saveRef = useRef(saveActivePage);
  useEffect(() => {
    saveRef.current = saveActivePage;
  }, [saveActivePage]);

  useEffect(() => {
    if (!editor) return;
    const update = ({
      editor,
      transaction,
    }: {
      editor: Editor;
      transaction: Transaction;
    }) => {
      if (!pageRef.current || !transaction.docChanged) return;
      const { changed, text } = getTitleChange(editor, transaction);
      if (!changed) return;
      latestTitleRef.current = text;
      saveRef.current();
    };
    editor.on("update", update);
    return () => {
      editor.off("update", update);
    };
  }, [editor]);

  useRecordPropertyPanel(editor, page);
  usePageComment(editor, page);

  if (!editor) {
    return (
      <div>
        <PageBodySkeleton page={page} contentClassName="page-peek-content" />
      </div>
    );
  }

  return (
    <>
      <div>
        <PeekEditorProvider value={editor}>
          <EditorContent editor={editor} className="page-peek-content" />
        </PeekEditorProvider>
      </div>
      <FloatingMenuMemo
        editor={editor}
        open={open}
        setOpen={setOpen}
        target={target}
        setTarget={setTarget}
        onSelectAsync={onSelectAsync}
        onAddCoverAsync={onAddCoverAsync}
        floatingRef={floatingRef}
        page={page}
      />
    </>
  );
}
