import { Editor } from "@tiptap/react";
import { Navigation } from "../../navigation";
import { TocProgressBar } from "./TocProgressBar";
import { TocContent } from "./TocContent";

export default function TocNavigationPanel({ editor }: { editor: Editor }) {

  if (!editor) return null;

  return (
    <Navigation
      className="fixed right-4 top-1/5 z-50 w-min-45"
    >
      <TocProgressBar editor={editor} />
      <TocContent editor={editor} />
    </Navigation>
  );
}