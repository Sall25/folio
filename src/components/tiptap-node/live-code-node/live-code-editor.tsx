import { useEffect, useRef } from "react";
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { Compartment, EditorState } from "@codemirror/state";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import {
  bracketMatching,
  HighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";

export type LiveCodeLanguage = "html" | "css" | "js";

/** Marks the edits that bring in `value` from outside (not typing). */
const SYNC_EVENT = "folio.sync";

// Colours that read on the block's dark editor, in light and dark themes.
const liveCodeHighlight = HighlightStyle.define([
  { tag: [tags.tagName, tags.className], color: "#e8a33d" },
  { tag: [tags.propertyName, tags.attributeName], color: "#7fb3f5" },
  { tag: [tags.string, tags.attributeValue], color: "#a5d6a7" },
  { tag: [tags.number, tags.unit, tags.color], color: "#f78c6c" },
  { tag: [tags.keyword, tags.modifier, tags.operatorKeyword], color: "#c792ea" },
  { tag: [tags.atom, tags.bool, tags.constant(tags.name)], color: "#c792ea" },
  { tag: tags.function(tags.variableName), color: "#82aaff" },
  { tag: tags.comment, color: "#7c7c79", fontStyle: "italic" },
  { tag: [tags.angleBracket, tags.punctuation, tags.bracket], color: "#9b9a97" },
  { tag: tags.invalid, color: "#ff6b6b" },
]);

const theme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#1e1e1e",
      color: "#e9e9e7",
      fontSize: "13.5px",
      height: "100%",
    },
    ".cm-scroller": {
      fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
      lineHeight: "1.7",
    },
    ".cm-content": { caretColor: "#e9e9e7", padding: "10px 0" },
    ".cm-gutters": {
      backgroundColor: "#1e1e1e",
      color: "#5c5c5a",
      border: "none",
    },
    ".cm-activeLine": { backgroundColor: "rgba(255,255,255,0.04)" },
    ".cm-activeLineGutter": { backgroundColor: "transparent", color: "#9b9a97" },
    "&.cm-focused": { outline: "none" },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection":
      { backgroundColor: "rgba(127,179,245,0.25) !important" },
    ".cm-cursor": { borderLeftColor: "#e9e9e7" },
    ".cm-tooltip": {
      backgroundColor: "#252525",
      border: "1px solid #333",
      color: "#e9e9e7",
    },
    ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
      backgroundColor: "#2f6fdb",
      color: "#fff",
    },
  },
  { dark: true },
);

const languageFor = (lang: LiveCodeLanguage) =>
  lang === "html"
    ? html({ autoCloseTags: true })
    : lang === "css"
      ? css()
      : javascript();

/** One tab's CodeMirror editor. Follows `value` when it changes from
 *  elsewhere (someone else typing, a reset), unless you're typing in it. */
export function LiveCodeEditor({
  language,
  value,
  readOnly,
  onChange,
  label,
}: {
  language: LiveCodeLanguage;
  value: string;
  readOnly: boolean;
  onChange: (value: string) => void;
  label: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const editable = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Created once per language; value and read-only follow below.
  useEffect(() => {
    if (!host.current) return;
    const v = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          drawSelection(),
          history(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          autocompletion(),
          keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...historyKeymap,
            ...completionKeymap,
            indentWithTab,
          ]),
          languageFor(language),
          syntaxHighlighting(liveCodeHighlight),
          theme,
          EditorView.contentAttributes.of({ "aria-label": label }),
          editable.current.of([
            EditorView.editable.of(!readOnly),
            EditorState.readOnly.of(readOnly),
          ]),
          EditorView.updateListener.of((u) => {
            // Every edit but our own sync from `value` (below).
            if (
              u.docChanged &&
              u.transactions.some((t) => !t.isUserEvent(SYNC_EVENT))
            )
              onChangeRef.current(u.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = v;
    return () => {
      v.destroy();
      view.current = null;
    };
    // Only on mount / language change: value and readOnly are synced below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  useEffect(() => {
    view.current?.dispatch({
      effects: editable.current.reconfigure([
        EditorView.editable.of(!readOnly),
        EditorState.readOnly.of(readOnly),
      ]),
    });
  }, [readOnly]);

  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const current = v.state.doc.toString();
    if (current === value) return;
    // Don't fight the person typing here: their own text wins until they
    // stop (their change comes back as this same value).
    if (v.hasFocus && !readOnly) return;
    v.dispatch({
      changes: { from: 0, to: current.length, insert: value },
      userEvent: SYNC_EVENT,
    });
  }, [value, readOnly]);

  return <div ref={host} className="live-code__editor" />;
}
