import { usePeekEditorExtensions } from "./hooks/use-peek-editor-extensions";
import { useActivePage } from "./context/active-page-context";
import type { Page } from "src/types";
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
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Target } from "src/components/tiptap-ui/cover/types";
import { FloatingMenu } from "@tiptap/react/menus";
import { FloatingActions } from "./floating-actions";
import { CoverHeader } from "src/components/tiptap-ui/cover";
import { usePageView } from "./context/page-view-context";
import {
  stripPropertyPanels,
  useRecordPropertyPanel,
} from "./hooks/use-record-property-panel";
import type { Transaction } from "@tiptap/pm/state";
import { usePage } from "src/hooks/use-pages";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";
import { useDebouncedCallback } from "use-debounce";
// NOTE: adjust this path to wherever you place template-choice-panel.tsx
import { TemplateChoicePanel } from "./components/template-choice-panel";

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
      // any non-paragraph block (heading, image, list, etc.) counts as content
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

export function PageCenterView({
  onClose,
  // onCreated,
}: {
  onClose?: () => void;
  /** Called with the new page after it's been saved for the first time */
  onCreated?: (page: Page) => void;
}) {
  const { target, setTarget: setViewTarget } = usePageView();
  const { data: page } = usePage(target?.pageId ?? null);
  const { mutateAsync } = usePatchPage(({ id, patch }) => patchPage(id, patch));
  const { setActivePageId } = useActivePage();
  const { extensions } = usePeekEditorExtensions(setActivePageId);

  const floatingRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const [iconTarget, setIconTarget] = useState<Target>("Emoji");

  // ── refs the editor effect reads (always current, no stale closures) ────────
  const pageRef = useRef(page);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  // latest title captured cheaply per keystroke (textContent is cheap);
  // getJSON() is NOT called here — only at flush.
  const latestTitleRef = useRef<string | null>(null);

  const editor = useEditor({
    extensions,
    content: page?.content ?? {
      type: "doc",
      content: [{ type: "title", content: [] }],
    },
    autofocus: "start",
  });

  const { editor: mainEditor } = useCurrentEditor();

  // Show the blank/template chooser while the body is empty and not dismissed.
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

  // Reset the chooser when a different page loads — during render, no effect.
  const [seenPageId, setSeenPageId] = useState(page?.id);
  if (page?.id !== seenPageId) {
    setSeenPageId(page?.id);
    setTemplateDismissed(false);
  }

  // One debounced save. The expensive work — getJSON() + stripPropertyPanels —
  // runs HERE, at flush, at most once per ~800ms of typing. The per-keystroke
  // handler just captures the title and reschedules. That deferral is the
  // typing-lag fix from before, carried into the patch world.
  const saveActivePage = useDebouncedCallback(
    () => {
      const current = pageRef.current;
      if (!current || !editor) return;

      const titleOverride = latestTitleRef.current;
      latestTitleRef.current = null;

      // partial patch — only what changed. NOT a whole-page spread.
      mutateAsync({
        id: current.id,
        patch: {
          ...(titleOverride != null ? { title: titleOverride } : {}),
          content: stripPropertyPanels(editor.getJSON()) as JSONContent,
          updatedAt: Date.now(), // epoch number, no .toString()
        },
      });
    },
    800,
    { maxWait: 2500 },
  );

  // keep a stable ref to the debounced saver for the editor event handler
  const saveRef = useRef(saveActivePage);
  useEffect(() => {
    saveRef.current = saveActivePage;
  }, [saveActivePage]);

  // ── the editor update handler — cheap per keystroke ─────────────────────────
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

      // cheap: capture the title text if the title node changed.
      // (No getRecordPropertyPanelChange — cells live in page.values now,
      //  edited via usePatchPage, so they never touch the editor doc.)
      const { changed, text } = getTitleChange(editor, transaction);
      if (changed) latestTitleRef.current = text;

      // reschedule the (deferred-serialization) save. getJSON runs at flush.
      saveRef.current();
    };

    editor.on("update", update);
    return () => {
      editor.off("update", update);
    };
  }, [editor]);

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

  useRecordPropertyPanel(editor, page ?? null);

  if (!page) return null;

  const showTemplatePanel = bodyEmpty && !templateDismissed;

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
                if (page) {
                  setViewTarget(undefined);
                  mainEditor?.commands.setContent(page.content, {
                    emitUpdate: false,
                  });
                  setActivePageId(page.id);
                }
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
