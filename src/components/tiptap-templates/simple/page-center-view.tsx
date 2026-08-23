import { usePeekEditorExtensions } from "./hooks/use-peek-editor-extensions";
import { useActivePageActions } from "./context/active-page-context";
import type { Page } from "src/types";
import { Editor, useEditor, type JSONContent } from "@tiptap/react";
import {
  Card,
  CardBody,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Ellipsis, Maximize2 } from "lucide-react";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { EditorContent } from "@tiptap/react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Target } from "src/components/tiptap-ui/cover/types";
import { FloatingMenu } from "@tiptap/react/menus";
import { FloatingActions } from "./floating-actions";
import { CoverHeader } from "src/components/tiptap-ui/cover";
import { usePageView, usePageViewActions } from "./context/page-view-context";
import {
  stripPropertyPanels,
  useRecordPropertyPanel,
} from "./hooks/use-record-property-panel";
import type { Transaction } from "@tiptap/pm/state";
import { usePage } from "src/hooks/use-pages";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";
import { useDebouncedCallback } from "use-debounce";
import { TemplateChoicePanel } from "./components/template-choice-panel";
import { PageCenterSkeleton } from "./components/skeletons";
import { usePageComment } from "./hooks/use-page-comment";
import { FavoriteToggle } from "./favorite-toggle";

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
// The editor MUST NOT be created until the page (and its content) is loaded.
// useEditor reads `content` once at init; if it inits while page is still
// loading, it starts EMPTY and the debounced save then overwrites the real
// content with empty — the template-page data loss. Gating here guarantees the
// editor is only ever created with real content, and keying by page.id remounts
// it (fresh content) when navigating to a different page.
export function PageCenterView({
  onClose,
  onCreated,
}: {
  onClose?: () => void;
  onCreated?: (page: Page) => void;
}) {
  const { target } = usePageView();
  const { data: page, isLoading } = usePage(target?.pageId ?? null);

  if (isLoading || !page) return <PageCenterSkeleton onClose={onClose} />;

  return (
    <PageCenterEditor
      key={page.id}
      page={page}
      onClose={onClose}
      onCreated={onCreated}
    />
  );
}

// ── Editor (only mounts once page is loaded) ───────────────────────────────────
function PageCenterEditor({
  page,
  onClose,
}: {
  page: Page;
  onClose?: () => void;
  onCreated?: (page: Page) => void;
}) {
  const { setTarget: setViewTarget } = usePageViewActions();
  const { mutateAsync } = usePatchPage(({ id, patch }) => patchPage(id, patch));
  const { setActivePageId } = useActivePageActions();
  const { extensions } = usePeekEditorExtensions(setActivePageId);

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

  // content is the REAL page content — the editor never inits empty now.
  const editor = useEditor({
    extensions,
    content: page.content ?? {
      type: "doc",
      content: [{ type: "title", content: [] }],
    },
    autofocus: "start",
  });

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

  const saveActivePage = useDebouncedCallback(
    () => {
      const current = pageRef.current;
      if (!current || !editor) return;

      const titleOverride = latestTitleRef.current;
      latestTitleRef.current = null;

      mutateAsync({
        id: current.id,
        patch: {
          ...(titleOverride != null ? { title: titleOverride } : {}),
          content: stripPropertyPanels(editor.getJSON()) as JSONContent,
          updatedAt: Date.now(),
        },
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
      if (changed) latestTitleRef.current = text;

      saveRef.current();
    };

    editor.on("update", update);
    return () => {
      editor.off("update", update);
    };
  }, [editor]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
  if (!editor) return <PageCenterSkeleton onClose={onClose} />;

  const showTemplatePanel = bodyEmpty && !templateDismissed;

  return (
    <>
      <ModalBackdrop onClose={onClose} />

      <Card className="page-create-modal">
        <CardItemGroup
          orientation="horizontal"
          style={{ width: "100%", justifyContent: "flex-start" }}
        >
          <Button
            size="large"
            variant="ghost"
            onClick={() => {
              setViewTarget(undefined);
              setActivePageId(page.id);
            }}
            aria-label="Open full page"
          >
            <Maximize2 className="tiptap-button-icon" />
          </Button>
          <Spacer orientation="horizontal" />
          <CardItemGroup orientation="horizontal">
            <FavoriteToggle page={page} />
            <Button size="large" variant="ghost" aria-label="More options">
              <Ellipsis className="tiptap-button-icon" />
            </Button>
          </CardItemGroup>
        </CardItemGroup>

        <CardBody style={{ width: "100%" }}>
          <CoverHeader
            collapsed={false}
            sidebarWidth={0}
            paddingLeft={0}
            translateX={0}
            hasThreads={false}
            providedPage={page}
            marginLeft={0}
          />
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
        </CardBody>
      </Card>
    </>
  );
}
