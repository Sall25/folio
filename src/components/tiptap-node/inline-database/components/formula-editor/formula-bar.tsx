import { useEffect, useRef } from "react";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { formulaLanguage } from "./formula-language";
import { formulaCompletions } from "./formula-completions";
import { Button } from "src/components/tiptap-ui-primitive/button";
import type { DatabaseProperty } from "../../types/types";

import "./formula-bar.scss";

interface FormulaBarProps {
  formula: string;
  properties: DatabaseProperty[];
  onChange: (value: string) => void;
  onDone: () => void;
}

export default function FormulaBar({
  formula,
  properties,
  onChange,
  onDone,
}: FormulaBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const view = new EditorView({
      state: EditorState.create({
        doc: formula,
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap, ...completionKeymap]),
          formulaLanguage,
          autocompletion({
            override: [formulaCompletions(properties)],
          }),
          placeholder("Type a formula…"),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChange(update.state.doc.toString());
            }
          }),
          EditorView.theme({
            "&": {
              fontSize: "13px",
              fontFamily: "monospace",
            },
            ".cm-content": {
              padding: "8px 10px",
              minHeight: "36px",
              maxHeight: "120px",
              overflowY: "auto",
              caretColor: "#111",
            },
            ".cm-focused": { outline: "none" },
            ".cm-line": { padding: 0 },
            ".cm-placeholder": { color: "#aaa" },
          }),
        ],
      }),
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external formula changes (e.g. snippet insertion) into the editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === formula) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: formula },
    });
  }, [formula]);

  return (
    <div className="formula-bar">
      <div className="formula-bar__header">
        <span className="formula-bar__label">Formula</span>
        <Button variant="primary" size="small" onClick={onDone}>
          Done
        </Button>
      </div>
      <div ref={containerRef} className="formula-bar__editor" />
    </div>
  );
}
