import { TocProgress } from "./toc-progress-bar";
import { TocContent } from "./toc-content";
import { useEditorRefs } from "src/components/tiptap-templates/simple/context/editor-refs-context";
import { useEffect } from "react";
import { useTocActions } from "./toc-context";

interface Props {
  maxShowCount?: number;
  topOffset?: number;
  className?: string;
}

function TocSidebarImpl({
  maxShowCount = 20,
  topOffset = 0,
  className = "",
}: Props) {
  const refsRef = useEditorRefs();

  const { setTocContent } = useTocActions();

  useEffect(() => {
    refsRef.current.setTocContent = setTocContent;
  }, [setTocContent, refsRef]);

  return (
    <aside className={`toc-sidebar ${className}`}>
      <TocProgress maxShowCount={maxShowCount} />
      <TocContent maxShowCount={maxShowCount} topOffset={topOffset} />
    </aside>
  );
}

export const TocSidebar = TocSidebarImpl;
