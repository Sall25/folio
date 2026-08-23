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
import { ChevronsRight, Ellipsis, Maximize2 } from "lucide-react";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { EditorContent } from "@tiptap/react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Target } from "src/components/tiptap-ui/cover/types";
import { FloatingMenu } from "@tiptap/react/menus";
import { FloatingActions } from "./floating-actions";
import { CoverHeader } from "src/components/tiptap-ui/cover";
import {
  stripPropertyPanels,
  useRecordPropertyPanel,
} from "./hooks/use-record-property-panel";
import { type Transaction } from "@tiptap/pm/state";
import { PeekEditorProvider } from "./context/peek-editor-provider";
import { useDebouncedCallback } from "use-debounce";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";
import {
  usePageViewActions,
  usePageViewState,
} from "./context/page-view-context";
import { usePage } from "src/hooks/use-pages";
import "./page-peek-view.scss";
import { usePageComment } from "./hooks/use-page-comment";
import { FavoriteToggle } from "./favorite-toggle";

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
// Do NOT create the editor until the page (and its content) has loaded. useEditor
// reads `content` once at init; if it inits while page is still loading it starts
// EMPTY, and the always-writes-content autosave then overwrites the real content
// with empty — the template-page data loss. Gating guarantees the editor is only
// ever created with real content; keying by page.id remounts it (fresh content)
// when the peek target changes.
export function PagePeekView({ onClose }: { onClose?: () => void }) {
  const { target: viewTarget } = usePageViewState();
  const { data: page, isLoading } = usePage(viewTarget?.pageId ?? null);

  if (isLoading || !page) return null; // peek has no skeleton; render nothing until loaded

  return <PagePeekEditor key={page.id} page={page} onClose={onClose} />;
}

// ── Editor (only mounts once page is loaded) ───────────────────────────────────
function PagePeekEditor({
  page,
  onClose,
}: {
  page: Page;
  onClose?: () => void;
}) {
  const { setTarget: setViewTarget } = usePageViewActions();
  const { setActivePageId } = useActivePageActions();
  const { extensions } = usePeekEditorExtensions(setActivePageId);
  const { mutateAsync } = usePatchPage(({ id, patch }) => patchPage(id, patch));

  const floatingRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Target>("Emoji");

  const pageRef = useRef(page);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  // page.content is guaranteed real here — the editor never inits empty.
  const editor = useEditor({
    extensions,
    content: page.content ?? {
      type: "doc",
      content: [{ type: "title", content: [] }],
    },
    autofocus: "start",
  });

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

  // deferred-serialization autosave
  const latestTitleRef = useRef<string | null>(null);
  const saveActivePage = useDebouncedCallback(
    () => {
      const p = pageRef.current;
      if (!p || !editor) return;
      const titleOverride = latestTitleRef.current;
      latestTitleRef.current = null;
      mutateAsync({
        id: p.id,
        patch: {
          title: titleOverride ?? p.title,
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
      if (!pageRef.current || !transaction.docChanged) return;
      const { changed, text } = getTitleChange(editor, transaction);
      if (changed) latestTitleRef.current = text;
      saveRef.current();
    };
    editor.on("update", update);
    return () => {
      editor.off("update", update);
    };
  }, [editor]);

  useRecordPropertyPanel(editor, page);
  usePageComment(editor, page);

  if (!editor) return null;

  return (
    <Card
      className="page-peek"
      style={{
        position: "fixed",
        borderRadius: 0,
        top: 0,
        bottom: 0,
        border: "1px solid var(--tt-border-color)",
        boxShadow: "var(--tt-shadow-elevated-md)",
      }}
    >
      <CardItemGroup
        orientation="horizontal"
        style={{ width: "100%", justifyContent: "flex-start" }}
      >
        <CardItemGroup orientation="horizontal">
          <Button
            size="large"
            style={{ background: "transparent" }}
            variant="ghost"
            onClick={onClose}
          >
            <ChevronsRight
              className="tiptap-button-icon"
              strokeWidth={1}
              style={{ width: 28, height: 22 }}
            />
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setViewTarget(undefined);
              setActivePageId(page.id);
            }}
          >
            <Maximize2 className="tiptap-button-icon" />
          </Button>
        </CardItemGroup>
        <Spacer orientation="horizontal" />
        <CardItemGroup orientation="horizontal">
          <FavoriteToggle page={page} />
          <Button variant="ghost">
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
      </CardBody>
    </Card>
  );
}
