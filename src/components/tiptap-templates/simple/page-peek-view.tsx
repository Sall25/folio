/* eslint-disable @typescript-eslint/no-explicit-any */
import { usePeekEditorExtensions } from "./hooks/use-peek-editor-extensions";
import { usePages } from "src/components/tiptap-templates/simple/use-pages";
import { useActivePage } from "./use-active-page";
import type { Page } from "./types";
import { Editor, useCurrentEditor, useEditor } from "@tiptap/react";
import {
  Card,
  CardBody,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { ChevronsRight, Ellipsis, Expand } from "lucide-react";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { EditorContent } from "@tiptap/react";
import { usePeekPage } from "./context/peek-page-context";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Target } from "src/components/tiptap-ui/cover/types";
import { FloatingMenu } from "@tiptap/react/menus";
import { FloatingActions } from "./floating-actions";
import { CoverHeader } from "src/components/tiptap-ui/cover";

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

export function PagePeekView({
  page,
  onClose,
}: {
  page: Page;
  onClose?: () => void;
}) {
  const { updatePageAsync, addCoverAsync } = usePages();
  const { setActivePageId } = useActivePage();
  const { setPeekPageId } = usePeekPage();
  const { extensions } = usePeekEditorExtensions(setActivePageId);
  const { editor: mainEditor } = useCurrentEditor();

  const floatingRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Target>("Emoji");

  const pageRef = useRef(page);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const onSelectAsync = useCallback(
    async (name: string, color?: string) => {
      setOpen(false);
      console.log("updating page", pageRef.current.id, "cover", {
        iconName: name,
      });
      await updatePageAsync({
        ...pageRef.current,
        cover: { ...pageRef.current.cover, iconName: name, target, color },
      });
    },
    [target, updatePageAsync], // no `page` in deps — use ref instead
  );

  const onAddCoverAsync = useCallback(async () => {
    await addCoverAsync(pageRef.current.id);
  }, [addCoverAsync]);

  const editor = useEditor({
    extensions,
    content: page.content ?? "",
    onUpdate: ({ editor }) => {
      const newTitle = editor.state.doc.firstChild?.textContent ?? "";
      if (!newTitle.trim()) return;
      if (!pageRef.current) return;

      updatePageAsync({
        ...pageRef.current,
        content: editor.getJSON(),
        title: newTitle,
      });

      if (!mainEditor) return;

      let titleCellPos: number | null = null;
      let titleCellNode: typeof mainEditor.state.doc.firstChild | null = null;

      mainEditor.state.doc.descendants((node, pos) => {
        if (titleCellPos !== null) return false;
        if (node.type.name !== "titleCell") return;
        if (node.attrs.pageId !== page.id) return;
        titleCellPos = pos;
        titleCellNode = node;
        return false;
      });

      if (titleCellPos === null || titleCellNode === null) return;
      if ((titleCellNode as any).textContent === newTitle) return;
      if (!newTitle.trim()) return;

      const { tr } = mainEditor.state;
      tr.insertText(
        newTitle,
        titleCellPos + 1,
        titleCellPos + 1 + (titleCellNode as any).content.size,
      );
      mainEditor.view.dispatch(tr);
    },
  });

  return (
    <Card
      className="page-peek"
      style={{
        padding: "5px 20px",
        marginTop: "var(--tt-toolbar-height)",
        position: "fixed",
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
      }}
    >
      <CardItemGroup
        orientation="horizontal"
        style={{ width: "100%", justifyContent: "flex-start" }}
      >
        <CardItemGroup orientation="horizontal">
          <Button variant="ghost" onClick={onClose}>
            <ChevronsRight className="tiptap-button-icon" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setActivePageId(page.id);
              setPeekPageId(null);
            }}
          >
            <Expand className="tiptap-button-icon" />
          </Button>
        </CardItemGroup>
        <Spacer orientation="horizontal" />
        <CardItemGroup orientation="horizontal">
          <Button variant="ghost">
            <Ellipsis className="tiptap-button-icon" />
          </Button>
        </CardItemGroup>
      </CardItemGroup>
      <CardBody className="simple-editor-center">
        <CoverHeader
          collapsed={false}
          sidebarWidth={0}
          paddingLeft={0}
          translateX={0}
          hasThreads={false}
          providedPage={page}
        />
        <div>
          <EditorContent editor={editor} className="simple-editor-content" />
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
