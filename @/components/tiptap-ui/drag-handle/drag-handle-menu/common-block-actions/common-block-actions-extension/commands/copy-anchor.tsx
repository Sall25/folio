import { Editor } from "@tiptap/core"

declare module '@tiptap/core'{
  interface Commands<ReturnType>{
    commentBlockExtension: {
      copyAnchor: ()=>ReturnType
    }
  }
}


export const copyAnchor = (editor: Editor) => {
  return () => {
    const { state } = editor
    const { selection } = state
    const { $from } = selection

    // Get top-level node of the selection
    const node = $from.node($from.depth)
    const pos = $from.before($from.depth) // start pos of the node

    // Optional: skip empty nodes
    if (!node || node.nodeSize === 0) return

    const url = `${window.location.origin}${window.location.pathname}#node-${pos}`

    navigator.clipboard.writeText(url)
      .then(() => console.log('Anchor copied:', url))
      .catch(err => console.error('Failed to copy anchor', err))
  }
}