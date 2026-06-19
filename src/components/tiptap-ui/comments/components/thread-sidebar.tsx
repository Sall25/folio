import type { Editor } from "@tiptap/core";
import { ThreadSidebarBase } from "./thread-sidebar-base";
import { ThreadsList } from "./threads-list";
import "./styles.scss";
import "./thread-sidebar.scss";
import { useThreadState } from "../context/useThreadState";

// Shell — no heavy hooks, always mounted
export function ThreadSidebar({
  editor,
  setHasThreads,
}: {
  editor: Editor | null;
  setHasThreads: (v: boolean) => void;
}) {
  return (
    <ThreadSidebarBase editor={editor} setHasThreads={setHasThreads}>
      <div className="thread-sidebar">
        {/* Thread sync isolated — re-renders don't affect parent */}
        <ThreadSidebarInner editor={editor} />
      </div>
    </ThreadSidebarBase>
  );
}
function ThreadSidebarInner({ editor }: { editor: Editor | null }) {
  const { positionedThreads } = useThreadState();

  return <ThreadsList positionedThreads={positionedThreads} editor={editor} />;
}
