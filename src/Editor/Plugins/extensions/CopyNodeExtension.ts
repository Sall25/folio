import { DOMSerializer, Fragment, Slice } from "@tiptap/pm/model";
import { Extension } from "@tiptap/react"

export const CopyNodeExtension = Extension.create({
  name: 'copyNodeExtension',

  addCommands() {
    return {
      copyNodeToClipboard(pos) {
        return ({ state }) => {

          const node = state.doc.nodeAt(pos);
          if (!node) return false;

          // Create a Slice exactly like ProseMirror does
          const slice = new Slice(Fragment.from(node), 0, 0);

          // Let ProseMirror generate proper clipboard HTML/text
          const serializer = DOMSerializer.fromSchema(state.schema);
          const wrap = document.createElement("div");
          wrap.appendChild(serializer.serializeFragment(slice.content));

          const html = wrap.innerHTML;
          const text = wrap.textContent ?? "";

          // Write to the REAL system clipboard
          if (navigator.clipboard && window.isSecureContext) {
            const blobHTML = new Blob([html], { type: "text/html" });
            const blobText = new Blob([text], { type: "text/plain" });

            const data = new ClipboardItem({
              "text/html": blobHTML,
              "text/plain": blobText,
            });

            navigator.clipboard.write([data]);
          } else {
            // Fallback for older browsers
            const textarea = document.createElement("textarea");
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            textarea.remove();
          }

          return true;
        }
      },
    }
  }
})