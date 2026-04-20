import { useCallback } from "react";
import { useThreadsOnPage } from "src/components/tiptap-ui/comments/hooks/use-threads-on-page";
import type { Comment, Thread } from "src/components/tiptap-ui/comments/types";

export interface UseThreadSetupReturn {
  threads: Thread[] | undefined;
  isLoading: boolean;
  onCreateThreadAsync: (thread: Thread) => Promise<void>;
  onDeleteThreadAsync: (thread: Thread) => Promise<void>;
  onResolveThreadAsync: (thread: Thread) => Promise<void>;
  onUnresolveThreadAsync: (thread: Thread) => Promise<void>;
  onAddCommentsAsync: (thread: Thread, newComments: Comment[]) => Promise<void>;
  onRemoveCommentsAsync: (thread: Thread) => Promise<void>;
  onUpdateCommentAsync: ({
    thread,
    commentId,
    newText,
  }: {
    thread: Thread;
    commentId: string;
    newText: string;
  }) => Promise<void>;
}

export function useThreadSetup(): UseThreadSetupReturn {
  const {
    createThreadAsync,
    deleteThreadAsync,
    resolveThreadAsync,
    unresolveThreadAsync,
    addCommentsAsync,
    removeCommentsAsync,
    updateCommentAsync,
    threads,
    isLoading,
  } = useThreadsOnPage();

  const onCreateThreadAsync = useCallback(
    async (thread: Thread) => {
      await createThreadAsync(thread);
    },
    [createThreadAsync],
  );

  const onDeleteThreadAsync = useCallback(
    async (thread: Thread) => {
      await deleteThreadAsync(thread);
    },
    [deleteThreadAsync],
  );

  const onResolveThreadAsync = useCallback(
    async (thread: Thread) => {
      await resolveThreadAsync(thread);
    },
    [resolveThreadAsync],
  );

  const onUnresolveThreadAsync = useCallback(
    async (thread: Thread) => {
      await unresolveThreadAsync(thread);
    },
    [unresolveThreadAsync],
  );

  const onAddCommentsAsync = useCallback(
    async (thread: Thread, newComments: Comment[]) => {
      await addCommentsAsync({ thread, newComments });
    },
    [addCommentsAsync],
  );

  const onRemoveCommentsAsync = useCallback(
    async (thread: Thread) => {
      await removeCommentsAsync(thread);
    },
    [removeCommentsAsync],
  );

  const onUpdateCommentAsync = useCallback(
    async ({
      thread,
      commentId,
      newText,
    }: {
      thread: Thread;
      commentId: string;
      newText: string;
    }) => {
      updateCommentAsync({ thread, commentId, newText });
    },
    [updateCommentAsync],
  );

  return {
    threads,
    isLoading,
    onCreateThreadAsync,
    onDeleteThreadAsync,
    onResolveThreadAsync,
    onUnresolveThreadAsync,
    onAddCommentsAsync,
    onRemoveCommentsAsync,
    onUpdateCommentAsync,
  };
}
