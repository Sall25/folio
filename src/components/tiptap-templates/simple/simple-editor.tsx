"use client";

// --- Styles ---
import "src/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "src/components/tiptap-node/code-block-node/code-block-node.scss";
import "src/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss";
import "src/components/tiptap-node/list-node/list-node.scss";
import "src/components/tiptap-node/image-node/image-node.scss";
import "src/components/tiptap-node/heading-node/heading-node.scss";
import "src/components/tiptap-node/paragraph-node/paragraph-node.scss";
import "src/components/tiptap-templates/simple/simple-editor.scss";
import "src/components/tiptap-templates/simple/toc.scss";
import "src/components/tiptap-templates/simple/page-create-modal.scss";
import type { View } from "src/types";
import { usePageBrowserTab } from "./hooks/use-page-browser-tab";
import { HomePage, LibraryPage, PageEditorLayout } from "./components/pages";
import { AppOverlays } from "./app-overlays";
import { SimpleEditorToolbar } from "./simple-editor-toolbar";

function SimpleEditorMain({ view }: { view: View }) {
  return (
    <>
      {view === "home" && <HomePage />}

      {view === "library" && <LibraryPage />}

      {view === "page" && <PageEditorLayout />}

      <AppOverlays />
    </>
  );
}

export function SimpleEditor({ view }: { view: View }) {
  usePageBrowserTab();

  return (
    <div className="simple-editor-wrapper">
      <SimpleEditorToolbar view={view} rectY={0} />
      <SimpleEditorMain view={view} />
    </div>
  );
}
