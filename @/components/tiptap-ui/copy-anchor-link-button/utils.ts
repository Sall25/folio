import type { Editor } from "@tiptap/react";

/** Extract the data-id from the node at the current selection */
export function extractNodeId(editor: Editor): string | null {
  const { $anchor } = editor.state.selection;

  // Start from the immediate parent and walk up — skip depth 0 (doc root)
  for (let d = $anchor.depth; d >= 1; d--) {
    const node = $anchor.node(d);
    const id = node.attrs?.id ?? node.attrs?.["data-id"];
    if (id) return id;
  }

  // Also check the node directly at the anchor position
  const nodeAfter = $anchor.nodeAfter;
  if (nodeAfter) {
    const id = nodeAfter.attrs?.id ?? nodeAfter.attrs?.["data-id"];
    if (id) return id;
  }

  return null;
}

/** Check if the current selection is on a node that has an ID */
export function canCopyAnchorLink(editor: Editor | null): boolean {
  if (!editor) return false;
  return extractNodeId(editor) !== null;
}

/** Build the anchor URL and copy it to clipboard */
export async function copyAnchorLink(
  editor: Editor,
  callbacks?: {
    onCopied?: () => void;
    onNodeIdNotFound?: (found: boolean) => void;
    onExtractedNodeId?: (id: string | null) => void;
  },
): Promise<boolean> {
  const nodeId = extractNodeId(editor);

  callbacks?.onExtractedNodeId?.(nodeId);

  if (!nodeId) {
    callbacks?.onNodeIdNotFound?.(false); // no argument — it was always "not found" here
    return false;
  }

  const url = new URL(window.location.href);
  url.hash = nodeId; // clean anchor, no extra search params

  try {
    await navigator.clipboard.writeText(url.toString());
    callbacks?.onCopied?.();
    return true;
  } catch {
    return false;
  }
}
