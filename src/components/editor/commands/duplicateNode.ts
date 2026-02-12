declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    duplicateNode: {
      duplicateNode: (pos: number) => ReturnType
    }
  }
}
