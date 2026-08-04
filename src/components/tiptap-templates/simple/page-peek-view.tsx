import { usePeekEditorExtensions } from "./hooks/use-peek-editor-extensions";
import { useActivePage } from "./context/active-page-context";
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
import { usePageView } from "./context/page-view-context";
import { usePage } from "src/hooks/use-pages";
import "./page-peek-view.scss";
import { usePageComment } from "./hooks/use-page-comment";

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
): {
  changed: boolean;
  text: string | null;
} {
  if (!transaction.docChanged) return { changed: false, text: null };

  const { $from } = editor.state.selection;

  const node = $from.node();
  if (node.type.name === "title") {
    return {
      changed: true,
      text: node.textContent,
    };
  }
  return {
    changed: false,
    text: null,
  };
}

export function PagePeekView({ onClose }: { onClose?: () => void }) {
  const { target: viewTarget, setTarget: setViewTarget } = usePageView();
  const { setActivePageId } = useActivePage();
  const { extensions } = usePeekEditorExtensions(setActivePageId);
  const { mutateAsync } = usePatchPage(({ id, patch }) => patchPage(id, patch));

  const floatingRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Target>("Emoji");

  const { data: page } = usePage(viewTarget?.pageId ?? null);
  const pageRef = useRef(page);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

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

  const editor = useEditor({
    extensions,
    content: page?.content ?? {
      type: "doc",
      content: [{ type: "title", content: [] }],
    },
    autofocus: "start",
  });

  // deferred-serialization autosave — identical to PageCenterView
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

  useRecordPropertyPanel(editor, page ?? null);
  usePageComment(editor, page ?? null);

  return (
    <Card
      className="page-peek"
      style={{
        //    marginTop: "var(--tt-toolbar-height)",
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
            <ChevronsRight className="tiptap-button-icon" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (page) {
                // Close the peek and navigate to the record as a full page.
                // Do NOT manually setContent the main editor here: the record
                // is its own Page, and the main editor's load effect (keyed on
                // activePageId) will load its content correctly on its own.
                // Manually stuffing page.content into the main editor while it
                // still belongs to the PARENT page caused the parent to be
                // saved with the record's content (content/id mismatch at
                // autosave time).
                setViewTarget(undefined);
                setActivePageId(page.id);
              }
            }}
          >
            <Maximize2 className="tiptap-button-icon" />
          </Button>
        </CardItemGroup>
        <Spacer orientation="horizontal" />
        <CardItemGroup orientation="horizontal">
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
        {/* <RecordPropertyPanel page={page} editor={mainEditor} /> */}
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
