import { Editor } from "@tiptap/react";
import { Navigation } from "./navigation";
import { TocProgressBar } from "./tocProgressBar";
import { TocContent } from "./tocContent";

import './colors.scss'
import './tocNavigationPanel.scss'

export default function TocNavigationPanel({ editor }: { editor: Editor }) {

  if (!editor) return null;

  return (
    <Navigation
      className="toc-navigation-panel"
    >
      <TocProgressBar editor={editor} />
      <TocContent editor={editor} />
    </Navigation>
  );
}