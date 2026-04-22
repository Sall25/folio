// import { useToc } from "src/components/tiptap-node/toc-node/use-toc";
// import type { Page } from "../types";
// import { Editor, useEditor } from "@tiptap/react";
// import { useEffect, useRef } from "react";
// import { useEditorExtensions } from "./use-editor-extensions";
// import { useInitThreads } from "./use-init-threads";
// import { useActivePageId } from "../context/active-page-context";
// import { useSimpleEditor } from "../context/simple-editor-context";

// const EDITOR_ATTRIBUTES = {
//   autocomplete: "off",
//   autocorrect: "off",
//   autocapitalize: "off",
//   spellcheck: "false",
//   "aria-label": "Main content area, start typing to enter text.",
//   class: "simple-editor",
// };

// const getCoverHeight = () => {
//   const coverEl = document.querySelector(".cover-header-wrapper"); // whatever your cover class is
//   return coverEl?.getBoundingClientRect().height ?? 0;
// };

// export function useEditorSetup(): { editor: Editor | null } {
//   const { setTocContent } = useToc();
//   const { extensions } = useEditorExtensions(setTocContent);
//   const isSwitchingPage = useRef(false);
//   const pendingUpdate = useRef<Page | null>(null);
//   const { setActivePageId } = useActivePageId();
//   const { activePage, updatePageAsync, addPageAsync, pages } =
//     useSimpleEditor();

//   const activePageRef = useRef<Page | null>(null);
//   const cursorCache = useRef<Map<string, { from: number; to: number }>>(
//     new Map(),
//   );
//   const scrollCache = useRef<Map<string, number>>(new Map());

//   useEffect(() => {
//     activePageRef.current = activePage;
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [activePage]);

//   const editor = useEditor({
//     immediatelyRender: false,
//     editorProps: { attributes: EDITOR_ATTRIBUTES },
//     extensions: extensions,
//     onUpdate({ editor }) {
//       if (isSwitchingPage.current || !activePageRef.current) return;

//       const newTitle = editor.state.doc.firstChild?.textContent;
//       // just store locally, don't save yet
//       pendingUpdate.current = {
//         ...activePageRef.current,
//         title: newTitle ?? "New Page",
//         content: editor.getJSON(),
//       };

//       // title saves immediately
//       if (newTitle !== activePageRef.current.title) {
//         updatePageAsync({
//           ...activePageRef.current,
//           title: newTitle ?? "New Page",
//         });
//       }
//     },
//     onDestroy() {
//       if (pendingUpdate.current) {
//         updatePageAsync(pendingUpdate.current);
//         pendingUpdate.current = null;
//       }
//     },
//     content: activePageRef.current ? activePageRef.current.content : "<p></p>",
//   });

//   useEffect(() => {
//     if (!editor) return;
//     if (!activePage) return;
//     if (!activePageRef.current) return;

//     editor.storage.slashCommand.activePage = activePageRef.current;
//     editor.storage.slashCommand.addPageAsync = addPageAsync;
//     editor.storage.slashCommand.setActivePageId = setActivePageId;
//     editor.storage.pageLink.pages = pages ?? [];

//     if (pendingUpdate.current) {
//       updatePageAsync(pendingUpdate.current);
//       pendingUpdate.current = null;
//     }

//     // at the very start of the effect, before the RAF
//     const prevPageId = activePageRef.current?.id;
//     if (prevPageId) {
//       console.log(
//         `💾 saving page ${prevPageId} → scroll: ${window.scrollY}, from: ${editor.state.selection.from}, to: ${editor.state.selection.to}`,
//       );
//       scrollCache.current.set(prevPageId, window.scrollY);
//       cursorCache.current.set(prevPageId, {
//         from: editor.state.selection.from,
//         to: editor.state.selection.to,
//       });
//     }

//     isSwitchingPage.current = true;
//     const raf = requestAnimationFrame(() => {
//       if (pendingUpdate.current) {
//         updatePageAsync(pendingUpdate.current);
//         pendingUpdate.current = null;
//       }
//       if (activePageRef.current) {
//         editor.commands.setContent(activePageRef.current.content);
//       }

//       requestAnimationFrame(() => {});

//       setTimeout(() => {
//         const savedScroll = scrollCache.current.get(activePage.id);
//         if (savedScroll !== undefined) {
//           window.scrollTo({ top: savedScroll, behavior: "instant" });

//           const coverHeight = getCoverHeight();
//           // fight ProseMirror's late scrollIntoView
//           setTimeout(() => {
//             window.scrollTo({
//               top: savedScroll - coverHeight,
//               behavior: "instant",
//             });
//           }, 100);
//         }
//       }, 100);

//       isSwitchingPage.current = false;
//     });

//     return () => cancelAnimationFrame(raf);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [activePage?.id, editor, addPageAsync, updatePageAsync, setActivePageId]);

//   useInitThreads({ editor });

//   return { editor };
// }

import { useToc } from "src/components/tiptap-node/toc-node/use-toc";
import type { Page } from "../types";
import { Editor, useEditor } from "@tiptap/react";
import { useEffect, useRef } from "react";
import { useEditorExtensions } from "./use-editor-extensions";
import { useInitThreads } from "./use-init-threads";
import { useActivePageId } from "../context/active-page-context";
import { useSimpleEditor } from "../context/simple-editor-context";

const EDITOR_ATTRIBUTES = {
  autocomplete: "off",
  autocorrect: "off",
  autocapitalize: "off",
  spellcheck: "false",
  "aria-label": "Main content area, start typing to enter text.",
  class: "simple-editor",
};

export function useEditorSetup(): { editor: Editor | null } {
  const { setTocContent } = useToc();
  const { extensions } = useEditorExtensions(setTocContent);
  const isSwitchingPage = useRef(false);
  const pendingUpdate = useRef<Page | null>(null);
  const { setActivePageId } = useActivePageId();
  const { activePage, updatePageAsync, addPageAsync, pages } =
    useSimpleEditor();

  const activePageRef = useRef<Page | null>(null);

  useEffect(() => {
    activePageRef.current = activePage;
  }, [activePage]);

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: { attributes: EDITOR_ATTRIBUTES },
    extensions: extensions,
    onUpdate({ editor }) {
      if (isSwitchingPage.current || !activePageRef.current) return;

      const newTitle = editor.state.doc.firstChild?.textContent;
      pendingUpdate.current = {
        ...activePageRef.current,
        title: newTitle ?? "New Page",
        content: editor.getJSON(),
      };

      if (newTitle !== activePageRef.current.title) {
        updatePageAsync({
          ...activePageRef.current,
          title: newTitle ?? "New Page",
        });
      }
    },
    onDestroy() {
      if (pendingUpdate.current) {
        updatePageAsync(pendingUpdate.current);
        pendingUpdate.current = null;
      }
    },
    content: activePageRef.current ? activePageRef.current.content : "<p></p>",
  });

  useEffect(() => {
    if (!editor) return;
    if (!activePage) return;
    if (!activePageRef.current) return;

    editor.storage.slashCommand.activePage = activePageRef.current;
    editor.storage.slashCommand.addPageAsync = addPageAsync;
    editor.storage.slashCommand.setActivePageId = setActivePageId;
    editor.storage.pageLink.pages = pages ?? [];

    if (pendingUpdate.current) {
      updatePageAsync(pendingUpdate.current);
      pendingUpdate.current = null;
    }

    isSwitchingPage.current = true;
    const raf = requestAnimationFrame(() => {
      if (pendingUpdate.current) {
        updatePageAsync(pendingUpdate.current);
        pendingUpdate.current = null;
      }
      if (activePageRef.current) {
        editor.commands.setContent(activePageRef.current.content);
      }

      isSwitchingPage.current = false;
    });

    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage?.id, editor, addPageAsync, updatePageAsync, setActivePageId]);

  useInitThreads({ editor });

  return { editor };
}
