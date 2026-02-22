declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    copyNodeToClipboard: {
      copyNodeToClipboard: (pos: number) => ReturnType
    }
  }
}
