import { Editor } from "@tiptap/react";
import { Navigation } from "../../navigation";
import { TocProgressBar } from "./TocProgressBar";
import { TocContent } from "./TocContent";

export default function TocNavigationPanel({ editor }: { editor: Editor }) {

  if (!editor) return null;

  return (
    <Navigation
      className="sticky top-32 left-full -translate-x-1 z-50 w-5 h-6"
    >
      <TocProgressBar editor={editor} />
      <TocContent editor={editor} />
    </Navigation>
  );
}