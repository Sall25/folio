import type { Editor } from "@tiptap/core";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ThreadsProvider } from "../context/threadProvider";

import type { ID, MeasuredThread, PositionedThread, Thread } from "src/types";
import { useThreadsByPage } from "src/hooks/use-threads";
import { useActivePage } from "src/components/tiptap-templates/simple/context/active-page-context";
import { mapThreads } from "../extensions/utils/mapThreads";
import type { Transaction } from "@tiptap/pm/state";
import { measureAllThreads } from "../extensions/utils/measureAllThreads";
import { resolveThreadCollisions } from "../extensions/utils/resolveThreadCollisions";
import { resolveActiveThreadCollisions } from "../extensions/utils/resolveActiveThreadCollisions";
import { usePatchThread } from "src/hooks/use-patch-thread";
import { patchThread } from "src/api/threads";
import { commentThreadPluginKey } from "../extensions";
import { scrollToThread } from "../extensions/utils/scrollToThread";
import { useCreateThread } from "src/hooks/use-create-thread";
import { makeThread } from "src/utils/make-thread";
import { useDeleteThread } from "src/hooks/use-delete-thread";

export function ThreadSidebarBase({
  editor,
  children,
  setHasThreads,
}: {
  editor: Editor | null;
  children: ReactNode;
  setHasThreads: (v: boolean) => void;
}) {
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const { activePageId } = useActivePage();

  const { data: threadsData /*isLoading*/ } = useThreadsByPage(activePageId);
  const threadsDataRef = useRef(threadsData);
  useEffect(() => void (threadsDataRef.current = threadsData), [threadsData]);

  // Push the thread list into the plugin so the decoration plugin has
  // something to render. Reconcile-by-id in the plugin's apply preserves
  // live (remapped) anchors across query refetches.
  useEffect(() => {
    if (!editor || !threadsData) return;
    const { view } = editor;
    view.dispatch(
      view.state.tr.setMeta(commentThreadPluginKey, {
        type: "setThreads",
        threads: threadsData,
      }),
    );
    // Force a decoration rebuild after the state settles — the fresh editor's
    // decoration plugin otherwise stays empty until an unrelated transaction.
    requestAnimationFrame(() => {
      if (editor.isDestroyed) return;
      editor.view.dispatch(
        editor.view.state.tr.setMeta(commentThreadPluginKey, {
          type: "scroll",
        }),
      );
    });
  }, [editor, threadsData]);

  const measuredThreadsRef = useRef<MeasuredThread[] | null>(null);
  const [positionedThreads, setPositionedThread] = useState<PositionedThread[]>(
    [],
  );

  const onSelectedThreadChange = useCallback(
    (thread: Thread | null) => {
      if (!editor) {
        setSelectedThread(thread);
        return;
      }
      if (thread) {
        editor.view.dispatch(
          editor.view.state.tr.setMeta(commentThreadPluginKey, {
            type: "selectThread",
            threadId: thread.id,
          }),
        );
      } else if (selectedThread) {
        editor.view.dispatch(
          editor.view.state.tr.setMeta(commentThreadPluginKey, {
            type: "unselectThread",
            threadId: selectedThread.id,
          }),
        );
      }
      // onTransaction catches these and syncs React state; the line below
      // is a safety net if no transaction listener is attached yet.
      setSelectedThread(thread);
    },
    [editor, selectedThread],
  );

  const onMapThreads = useCallback((tr: Transaction) => {
    if (!threadsDataRef.current) return;
    threadsDataRef.current = mapThreads(tr, threadsDataRef.current);
  }, []);
  const onMeasureAllThreads = useCallback((editor: Editor) => {
    if (!threadsDataRef.current || !editor) return;
    measuredThreadsRef.current = measureAllThreads(
      editor,
      threadsDataRef.current,
    );
  }, []);
  const onResolveThreadCollisions = useCallback(() => {
    if (!measuredThreadsRef.current) return;
    setPositionedThread(resolveThreadCollisions(measuredThreadsRef.current));
  }, []);

  const onResolveActiveThreadCollisions = useCallback((threadId: ID) => {
    if (!measuredThreadsRef.current) return;
    setPositionedThread(
      resolveActiveThreadCollisions(measuredThreadsRef.current, threadId),
    );
  }, []);

  // --- positionedThreads orchestration ---
  // Full pipeline: measure anchors in the DOM, then resolve collisions into
  // final Y positions. rAF-throttled so bursts of transactions coalesce into
  // one measure per frame, and so measurement runs after the decoration DOM
  // has painted.
  const reflowRafRef = useRef<number | null>(null);
  const reflowThreads = useCallback(() => {
    if (!editor || !threadsDataRef.current) {
      return;
    }
    onMeasureAllThreads(editor);
    if (selectedThread) {
      onResolveActiveThreadCollisions(selectedThread.id);
    } else {
      onResolveThreadCollisions();
    }
  }, [
    editor,
    selectedThread,
    onMeasureAllThreads,
    onResolveThreadCollisions,
    onResolveActiveThreadCollisions,
  ]);

  // Cancel-and-reschedule: never bail on a pending frame (that's how the
  // guard got permanently stuck). Always cancel the prior frame and queue a
  // fresh one, so the latest call always wins and the ref can't deadlock.
  const scheduleReflow = useCallback(() => {
    if (reflowRafRef.current !== null) {
      cancelAnimationFrame(reflowRafRef.current);
    }
    reflowRafRef.current = requestAnimationFrame(() => {
      reflowRafRef.current = null;
      reflowThreads();
    });
  }, [reflowThreads]);

  // Reflow when the thread set loads/changes or the selection changes.
  useEffect(() => {
    scheduleReflow();
  }, [threadsData, selectedThread, scheduleReflow]);

  // Reflow once the editor has actually rendered its content. On a fresh load
  // the Yjs document hydrates AFTER threads arrive, so the first reflow can run
  // against an unrendered doc (coordsAtPos throws → threads fall back). Firing
  // again on editor "create" — and once more on the next frame — re-measures
  // after the content paints, so cards land on their real positions without
  // needing a manual edit/scroll to trigger it.
  useEffect(() => {
    if (!editor) return;
    const onReady = () => scheduleReflow();
    editor.on("create", onReady);
    // In case "create" already fired before this effect attached, schedule now
    // and once more after paint.
    scheduleReflow();
    const raf = requestAnimationFrame(() => scheduleReflow());
    return () => {
      editor.off("create", onReady);
      cancelAnimationFrame(raf);
    };
  }, [editor, scheduleReflow]);

  // Reflow on document edits AND on plugin-state changes. A doc edit remaps
  // anchors then repositions. But selecting, hovering-off, or receiving a new
  // thread set (setThreads) changes what must be measured/positioned WITHOUT a
  // doc change — and those previously triggered no reflow, so measuredThreads /
  // positionedThreads never populated for them. Reflow on those metas too.
  useEffect(() => {
    if (!editor) return;
    const onTx = ({ transaction }: { transaction: Transaction }) => {
      if (transaction.docChanged) {
        onMapThreads(transaction);
        scheduleReflow();
        return;
      }
      const meta = transaction.getMeta(commentThreadPluginKey) as
        | { type?: string }
        | undefined;
      if (
        meta &&
        (meta.type === "setThreads" ||
          meta.type === "selectThread" ||
          meta.type === "unselectThread")
      ) {
        scheduleReflow();
      }
    };
    editor.on("transaction", onTx);
    return () => {
      editor.off("transaction", onTx);
    };
  }, [editor, onMapThreads, scheduleReflow]);

  useEffect(() => {
    return () => {
      if (reflowRafRef.current !== null) {
        cancelAnimationFrame(reflowRafRef.current);
        reflowRafRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!threadsDataRef.current) return;
    const hasThreads = threadsDataRef.current.length > 0;
    setHasThreads(hasThreads);
  }, [setHasThreads]);

  const deleteThreadApi = useDeleteThread();
  const deleteTread = useCallback(
    (threadId: string) => {
      deleteThreadApi.mutate({ id: threadId });
    },
    [deleteThreadApi],
  );

  const onClickThread = useCallback(
    (threadId: ID) => {
      if (!editor || !threadsDataRef.current) return;

      const thread = threadsDataRef.current.find((t) => t.id === threadId);

      if (thread) {
        const tr = editor.view.state.tr.setMeta(commentThreadPluginKey, {
          type: "selectThread",
          threadId,
        });
        editor.view.dispatch(tr);

        setSelectedThread(thread);
      }
    },
    [editor],
  );

  const onHoverThread = useCallback(
    (threadId: string) => {
      if (!editor || !threadsDataRef.current) return;

      const thread = threadsDataRef.current.find((t) => t.id === threadId);

      if (thread) {
        const tr = editor.view.state.tr.setMeta(commentThreadPluginKey, {
          type: "hoverThread",
          threadId,
        });
        editor.view.dispatch(tr);
      }
    },
    [editor],
  );

  const onLeaveThread = useCallback(() => {
    if (!editor) return;
    const tr = editor.view.state.tr.setMeta(commentThreadPluginKey, {
      type: "hoverThread",
      threadId: null,
    });
    editor.view.dispatch(tr);
  }, [editor]);

  const mutateThread = usePatchThread(({ id, patch }) =>
    patchThread(id, patch),
  );

  const onResolveThread = useCallback(
    (threadId: string) => {
      mutateThread.mutate({ id: threadId, patch: { status: "resolved" } });
    },
    [mutateThread],
  );

  const onUnresolveThread = useCallback(
    (threadId: string) => {
      mutateThread.mutate({ id: threadId, patch: { status: "open" } });
    },
    [mutateThread],
  );

  const createThread = useCreateThread();

  useEffect(() => {
    if (!editor || !activePageId) return;

    const onTransaction = ({ transaction }: { transaction: Transaction }) => {
      const meta = transaction.getMeta(commentThreadPluginKey);
      if (meta && meta.type === "selectThread") {
        const { threadId } = meta;
        const thread = threadsDataRef.current?.find((t) => t.id === threadId);
        if (thread) {
          scrollToThread(threadId);
          setSelectedThread(thread);
        }
      } else if (meta && meta.type === "unselectThread") {
        setSelectedThread(null);
      } else if (meta && meta.type === "draftThread") {
        const { from, to, threadId } = meta;

        const newThread = makeThread({
          id: threadId,
          pageId: activePageId,
          anchor: { from, to },
          status: "drafted",
        });
        console.log("CREATE newThread anchor:", newThread.anchor);
        createThread.mutate(newThread);
      }
    };
    editor.on("transaction", onTransaction);

    return () => {
      editor.off("transaction", onTransaction);
    };
  }, [editor, activePageId, createThread]);

  return (
    <ThreadsProvider
      threads={threadsData ?? []}
      selectedThread={selectedThread}
      onDeleteThread={deleteTread}
      onClickThread={onClickThread}
      onHoverThread={onHoverThread}
      onLeaveThread={onLeaveThread}
      onResolveThread={onResolveThread}
      onUnresolveThread={onUnresolveThread}
      positionedThreads={positionedThreads}
      onMapThreads={onMapThreads}
      onMeasureAllThreads={onMeasureAllThreads}
      onResolveThreadCollisions={onResolveThreadCollisions}
      onResolveActiveThreadCollisions={onResolveActiveThreadCollisions}
      onSelectedThreadChange={onSelectedThreadChange}
      requestReflow={scheduleReflow}
    >
      {children}
    </ThreadsProvider>
  );
}
