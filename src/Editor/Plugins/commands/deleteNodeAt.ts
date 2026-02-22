declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    deleteNodeAt: {
      deleteNodeAt: (pos: number) => ReturnType
    }
  }
}