// // hooks/use-scroll-to-anchor.ts
// import { useEffect } from "react";
// import type { Editor } from "@tiptap/react";

// import "./use-scroll-to-anchor.scss";

// interface Options {
//   editor: Editor | null;
//   /** Max time to wait before giving up on scroll (ms) */
//   timeout?: number;
// }

// export function useScrollToAnchor({ editor, timeout = 3000 }: Options) {
//   useEffect(() => {
//     if (!editor) return;

//     const hash = decodeURIComponent(window.location.hash.slice(1));
//     if (!hash) return;

//     let settled = false;

//     const scroll = () => {
//       if (settled) return;
//       const target = editor.view.dom.querySelector(`[data-id="${hash}"]`);
//       if (!target) return;

//       settled = true;
//       editor.off("update", scroll);
//       clearTimeout(fallbackTimer);

//       target.scrollIntoView({ behavior: "smooth", block: "start" });
//       target.classList.add("anchor-highlight");
//       setTimeout(() => target.classList.remove("anchor-highlight"), 1500);
//     };

//     // Try immediately — content may already be rendered
//     scroll();

//     // If not, retry on every editor update until the node appears
//     editor.on("update", scroll);

//     // Safety net: give up after `timeout` ms regardless
//     const fallbackTimer = setTimeout(() => {
//       settled = true;
//       editor.off("update", scroll);
//     }, timeout);

//     return () => {
//       settled = true;
//       editor.off("update", scroll);
//       clearTimeout(fallbackTimer);
//     };
//   }, [editor, timeout]);
// }

// hooks/use-scroll-to-anchor.ts
import { useEffect } from "react";
import type { Editor } from "@tiptap/react";

import "./use-scroll-to-anchor.scss";

interface Options {
  editor: Editor | null;
  timeout?: number;
}

function findNodePosByAnchorId(editor: Editor, id: string): number | null {
  let foundPos: number | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (foundPos !== null) return false; // already found, stop traversal
    if (node.attrs?.id === id) {
      foundPos = pos;
      return false;
    }
  });

  return foundPos;
}

export function useScrollToAnchor({ editor, timeout = 3000 }: Options) {
  useEffect(() => {
    if (!editor) return;

    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (!hash) return;

    let settled = false;

    const scroll = () => {
      if (settled) return;

      const pos = findNodePosByAnchorId(editor, hash);
      if (pos === null) return;

      settled = true;
      editor.off("update", scroll);
      clearTimeout(fallbackTimer);

      // Use ProseMirror's DOM position mapping to get the actual element
      const domPos = editor.view.domAtPos(pos);
      const el =
        domPos.node instanceof HTMLElement
          ? domPos.node
          : domPos.node.parentElement;

      if (!el) return;

      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("anchor-highlight");
      setTimeout(() => el.classList.remove("anchor-highlight"), 1500);
    };

    scroll();
    editor.on("update", scroll);

    const fallbackTimer = setTimeout(() => {
      settled = true;
      editor.off("update", scroll);
    }, timeout);

    return () => {
      settled = true;
      editor.off("update", scroll);
      clearTimeout(fallbackTimer);
    };
  }, [editor, timeout]);
}
