import { posToDOMRect, ReactRenderer, type Editor } from "@tiptap/react";
import { computePosition, flip, offset, shift } from "@floating-ui/dom";
import { InviteMentionPanel } from "./invite-mention-panel";

/** Opens the panel at document position `pos` (where the mention goes). */
export function openInviteMentionPanel(
  editor: Editor,
  pos: number,
  initialEmail: string,
) {
  // eslint-disable-next-line prefer-const
  let renderer: ReactRenderer;
  const close = () => {
    document.removeEventListener("mousedown", onOutside, true);
    renderer.element.remove();
    renderer.destroy();
  };
  const onOutside = (e: MouseEvent) => {
    if (!renderer.element.contains(e.target as Node)) close();
  };

  renderer = new ReactRenderer(InviteMentionPanel, {
    editor,
    props: { editor, pos, initialEmail, onClose: close },
  });
  const el = renderer.element as HTMLElement;
  el.style.position = "absolute";
  el.style.zIndex = "9990";
  document.body.appendChild(el);

  const rect = posToDOMRect(editor.view, pos, pos);
  void computePosition({ getBoundingClientRect: () => rect }, el, {
    placement: "bottom-start",
    strategy: "absolute",
    middleware: [offset(6), flip(), shift({ padding: 8 })],
  }).then(({ x, y }) => {
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  });

  // After the click that opened it has finished.
  setTimeout(() => document.addEventListener("mousedown", onOutside, true), 0);
}
