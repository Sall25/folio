import { useSyncExternalStore } from "react";
import type { Editor } from "@tiptap/core";
import { isPageEditor, pinTargets, type PinPlace } from "./pin-targets";

/** The element a pinned block is drawn into, or null (not pinned there,
 *  no such place on screen, or not the page's editor): the block is then
 *  drawn in the page as usual. */
export function usePinTarget(
  editor: Editor,
  place: PinPlace,
  pinned: boolean,
): HTMLElement | null {
  const el = useSyncExternalStore(pinTargets.subscribe, () =>
    pinTargets.get(place),
  );
  return pinned && el && isPageEditor(editor) ? el : null;
}
