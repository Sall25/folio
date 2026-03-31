declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    commentThreadExtension: {
      draftThread: () => ReturnType;

      submitThread: (content: string) => ReturnType;

      selectThread: (threadId: string, active?: boolean) => ReturnType;

      unselectThread: (threadId?: string) => ReturnType;

      removeThread: (threadId?: string) => ReturnType;

      resolveThread: (threadId: string) => ReturnType;

      unresolveThread: (threadId: string) => ReturnType;

      addComment: (
        threadId: string,
        authorId: string,
        text: string,
      ) => ReturnType;

      removeComment: (threadId: string, commentId: string) => ReturnType;

      updateComment: (
        threadId: string,
        commentId: string,
        newText: string,
      ) => ReturnType;

      hoverThread: (threadId?: string) => ReturnType;

      hoverOffThread: (threadId: string) => ReturnType;

      forceMeasure: (threadId: string) => ReturnType;
    };
  }
}
