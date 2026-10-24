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
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Target } from "src/features/pages/cover/types";
import { FloatingMenu } from "@tiptap/react/menus";
import { FloatingActions } from "../shell/floating-actions";
import { CoverHeader } from "src/features/pages/cover";
import { usePageView } from "./context/page-view-context";
import { useRecordPropertyPanel } from "../database/record-property-panel/use-record-property-panel";
import type { Transaction } from "@tiptap/pm/state";
import { usePage } from "src/hooks/use-pages";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";
import { useDebouncedCallback } from "use-debounce";
import { TemplateChoicePanel } from "./templates/template-choice-panel";
import { PageBodySkeleton } from "./page-body-skeleton";
import { usePageComment } from "../comments/page-comment-node/use-page-comment";
import { useMentionData } from "src/components/tiptap-ui/mention-menu/use-mention-data";
import { PeekToolbar } from "./peek-toolbar";

// Backdrop overlay for the centered modal
function ModalBackdrop({ onClose }: { onClose?: () => void }) {
  return (
    <div
      className="page-create-backdrop"
      onClick={onClose}
      aria-hidden="true"
    />
  );
}

// Body is empty when nothing past the title node carries content.
function isBodyEmpty(editor: Editor): boolean {
  let hasBody = false;
  editor.state.doc.forEach((node) => {
    if (hasBody) return;
    if (node.type.name === "title") return;
    if (node.type.name === "paragraph") {
      if (node.content.size > 0) hasBody = true;
    } else {
      hasBody = true;
    }
  });
  return !hasBody;
}

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
// page its own editor.
//
// The modal itself opens at once: its frame (backdrop, card, toolbar) stays
// mounted from the click on — so its entry animation plays once — the cover
// and title show as soon as the page is known, and the body is a skeleton
// until the editor is ready (page-body-skeleton).
export function PageCenterView({
  onClose,
  onCreated,
}: {
  onClose?: () => void;
  onCreated?: (page: Page) => void;
}) {
  const { target } = usePageView();
  const pageId = target?.pageId ?? null;
  const { data: page } = usePage(pageId);

  return (
    <CenterFrame pageId={pageId} page={page ?? null} onClose={onClose}>
      {page ? (
        <PageCenterCollab key={page.id} page={page} onCreated={onCreated} />
      ) : (
        <div>
          <PageBodySkeleton
            page={null}
            contentClassName="page-create-content"
          />
        </div>
      )}
    </CenterFrame>
  );
}

// ── Frame ─────────────────────────────────────────────────────────────────────
// Backdrop, card and toolbar — everything that doesn't need the editor, so it
// can show before the editor exists.
function CenterFrame({
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
  // Escape closes, loaded or not.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <>
      <ModalBackdrop onClose={onClose} />

      <Card className="page-create-modal">
        <PeekToolbar mode="Center" pageId={pageId} page={page} />

        <CardBody style={{ width: "100%" }}>{children}</CardBody>
      </Card>
    </>
  );
}

// ── Page (known): cover at once, body once the live document is ready ────────
function PageCenterCollab({
  page,
  onCreated,
}: {
  page: Page;
  onCreated?: (page: Page) => void;
}) {
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
        <PageCenterEditor
          page={page}
          extensions={extensions}
          onCreated={onCreated}
        />
      ) : (
        <div>
          <PageBodySkeleton
            page={page}
            contentClassName="page-create-content"
          />
        </div>
      )}
    </>
  );
}

// ── Editor (only mounts once the live document is ready) ───────────────────────
function PageCenterEditor({
  page,
  extensions,
}: {
  page: Page;
  extensions: Extensions;
  onCreated?: (page: Page) => void;
}) {
  const { mutateAsync } = usePatchPage(({ id, patch }) => patchPage(id, patch));

  const floatingRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [iconTarget, setIconTarget] = useState<Target>("Emoji");

  // page is guaranteed present here (parent gated on it), but keep the ref
  // pattern for the debounced saver / async handlers that read it later.
  const pageRef = useRef(page);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const latestTitleRef = useRef<string | null>(null);

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

  const [templateDismissed, setTemplateDismissed] = useState(false);
  const [bodyEmpty, setBodyEmpty] = useState(true);

  useEffect(() => {
    if (!editor) return;
    const check = () => setBodyEmpty(isBodyEmpty(editor));
    check();
    editor.on("update", check);
    return () => {
      editor.off("update", check);
    };
  }, [editor]);

  // Autosave — the TITLE only (it's also a column, for lists and search).
  // The content saves itself through the live document.
  const saveActivePage = useDebouncedCallback(
    () => {
      const current = pageRef.current;
      const title = latestTitleRef.current;
      if (!current || title == null) return;
      latestTitleRef.current = null;
      mutateAsync({
        id: current.id,
        patch: { title, updatedAt: Date.now() },
      });
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
      if (!pageRef.current) return;
      if (!transaction.docChanged) return;

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

  const onSelectAsync = useCallback(
    async (name: string, color?: string) => {
      if (!pageRef.current) return;
      setOpen(false);
      await mutateAsync({
        id: pageRef.current.id,
        patch: {
          cover: {
            ...pageRef.current.cover,
            iconName: name,
            target: iconTarget,
            color: color ?? null,
          },
        },
      });
    },
    [iconTarget, mutateAsync],
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

  useRecordPropertyPanel(editor, page);
  usePageComment(editor, page);

  // Editor may still be null for the first render tick after mount.
  if (!editor) {
    return (
      <div>
        <PageBodySkeleton page={page} contentClassName="page-create-content" />
      </div>
    );
  }

  const showTemplatePanel = bodyEmpty && !templateDismissed;

  return (
    <>
      <div>
        <EditorContent editor={editor} className="page-create-content" />
      </div>

      {showTemplatePanel && (
        <TemplateChoicePanel
          page={page}
          editor={editor}
          onDismiss={() => setTemplateDismissed(true)}
        />
      )}

      <FloatingMenuMemo
        editor={editor}
        open={open}
        setOpen={setOpen}
        target={iconTarget}
        setTarget={setIconTarget}
        onSelectAsync={onSelectAsync}
        onAddCoverAsync={onAddCoverAsync}
        floatingRef={floatingRef}
        page={page}
      />
    </>
  );
}
