import { Extension } from "@tiptap/core";
import { PINNABLE_TYPES } from "./pin-targets";

// The pin attributes, on every block that can be pinned. Stored on the node,
// so the pin is shared by everyone on the page (Yjs syncs it).
//   pinSide — drawn in the rail beside the page instead of in place.
//   pinTop  — a compact copy in the top bar (the Pomodoro's timer chip).
export const PinnableExtension = Extension.create({
  name: "pinnable",

  addGlobalAttributes() {
    return [
      {
        types: PINNABLE_TYPES,
        attributes: {
          pinSide: {
            default: false,
            parseHTML: (el) => el.getAttribute("data-pin-side") === "true",
            renderHTML: (attrs) =>
              attrs.pinSide ? { "data-pin-side": "true" } : {},
          },
          pinTop: {
            default: false,
            parseHTML: (el) => el.getAttribute("data-pin-top") === "true",
            renderHTML: (attrs) =>
              attrs.pinTop ? { "data-pin-top": "true" } : {},
          },
        },
      },
    ];
  },
});
