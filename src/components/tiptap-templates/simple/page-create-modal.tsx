/* eslint-disable @typescript-eslint/no-explicit-any */
import { usePeekEditorExtensions } from "./hooks/use-peek-editor-extensions";
import { usePages } from "src/components/tiptap-templates/simple/use-pages";
import { useActivePage } from "./use-active-page";
import type { Page } from "./types";
import {
  Editor,
  useCurrentEditor,
  useEditor,
  type JSONContent,
} from "@tiptap/react";
import {
  Card,
  CardBody,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { X, Expand, Ellipsis } from "lucide-react";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { EditorContent } from "@tiptap/react";
import { usePeekPage } from "./context/peek-page-context";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Target } from "src/components/tiptap-ui/cover/types";
import { FloatingMenu } from "@tiptap/react/menus";
import { FloatingActions } from "./floating-actions";
import { CoverHeader } from "src/components/tiptap-ui/cover";
import { findPage } from "src/lib/find-page";
import { useCreatePage } from "./context/create-page-context";
import {
  stripPropertyPanels,
  useRecordPropertyPanel,
} from "./hooks/use-record-property-panel";
import type { Transaction } from "@tiptap/pm/state";

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

function getRecordPropertyPanelChange(
  editor: Editor,
  transaction: Transaction,
): boolean {
  if (!transaction.docChanged) return false;

  const { $from } = editor.state.selection;

  const node = $from.node();
  if (node.type.name === "databaseRecord") {
    return true;
  }
  return false;
}

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

export function PageCreateModal({
  onClose,
  // onCreated,
}: {
  onClose?: () => void;
  /** Called with the new page after it's been saved for the first time */
  onCreated?: (page: Page) => void;
}) {
  const { createPageId } = useCreatePage();
  const { pages, debounceUpdatePage, debounceUpdatePageFast } = useActivePage();
  const page =
    createPageId !== null && pages ? findPage(pages, createPageId) : null;

  const { updatePageAsync, addCoverAsync } = usePages();
  const { setActivePageId } = useActivePage();
  const { setPeekPageId } = usePeekPage();
  const { extensions } = usePeekEditorExtensions(setActivePageId);

  const floatingRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Target>("Emoji");

  const pageRef = useRef(page);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const debounceUpdatePageRef = useRef(debounceUpdatePage);
  const debounceUpdatePageFastRef = useRef(debounceUpdatePageFast);

  // Close on Escape key
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
      await updatePageAsync({
        ...pageRef.current,
        cover: { ...pageRef.current.cover, iconName: name, target, color },
      });
    },
    [target, updatePageAsync],
  );

  const onAddCoverAsync = useCallback(async () => {
    if (!pageRef.current) return;
    await addCoverAsync(pageRef.current.id);
  }, [addCoverAsync]);

  const editor = useEditor({
    extensions,
    content: page?.content ?? {
      type: "doc",
      content: [{ type: "title", content: [] }],
    },
    autofocus: "start",
  });

  useRecordPropertyPanel(editor, pages, page?.id ?? null);

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

      const { changed, text } = getTitleChange(editor, transaction);
      const recordChanged = getRecordPropertyPanelChange(editor, transaction);

      if (changed || recordChanged) {
        debounceUpdatePageFastRef.current({
          ...pageRef.current,
          title: text ?? pageRef.current.title,
          content: stripPropertyPanels(editor.getJSON()) as JSONContent,
          updatedAt: Date.now().toString(),
        });
      } else {
        debounceUpdatePageRef.current({
          ...pageRef.current,
          content: stripPropertyPanels(editor.getJSON()) as JSONContent,
          // content: editor.getJSON(),
          // databaseId: pageRef.current.databaseId,
          // recordId: pageRef.current.recordId,
          updatedAt: Date.now().toString(),
        });
      }
    };

    editor.on("update", update);

    return () => {
      editor.off("update", update);
    };
  }, [editor, debounceUpdatePage, debounceUpdatePageFast]);

  if (!page) return null;

  return (
    <>
      <ModalBackdrop onClose={onClose} />

      <Card className="page-create-modal">
        {/* Toolbar */}
        <CardItemGroup
          orientation="horizontal"
          style={{ width: "100%", justifyContent: "flex-start" }}
        >
          <CardItemGroup orientation="horizontal">
            <Button variant="ghost" onClick={onClose} aria-label="Close">
              <X className="tiptap-button-icon" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setActivePageId(page.id);
                setPeekPageId(null);
                onClose?.();
              }}
              aria-label="Open full page"
            >
              <Expand className="tiptap-button-icon" />
            </Button>
          </CardItemGroup>
          <Spacer orientation="horizontal" />
          <CardItemGroup orientation="horizontal">
            <Button variant="ghost" aria-label="More options">
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
          />
          <div>
            <EditorContent editor={editor} className="page-create-content" />
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
    </>
  );
}
