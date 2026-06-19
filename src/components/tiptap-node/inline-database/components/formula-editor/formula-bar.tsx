import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import {
  EditorView,
  keymap,
  placeholder,
  ViewPlugin,
  Decoration,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { EditorState, type Range } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { createRoot, type Root } from "react-dom/client";
import { formulaLanguage } from "./formula-language";
import { formulaCompletions } from "./formula-completions";
import { PROPERTY_TYPE_ICONS } from "src/types/property-type-meta";
import { Button } from "src/components/tiptap-ui-primitive/button";
import type { DatabaseProperty } from "src/types/types";
import "./formula-bar.scss";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

interface FormulaBarProps {
  formula: string;
  properties: DatabaseProperty[];
  onChange: (value: string) => void;
  onDone: () => void;
  // When true, the Done button is disabled (formula has a validation error).
  disabled?: boolean;
}

// Imperative API exposed to the parent so it can insert text THROUGH the editor
// (at the caret, focus-gated) rather than appending to React state.
export interface FormulaBarHandle {
  // Inserts at the caret ONLY if the editor currently has focus. Returns true
  // if it inserted, false if it was ignored (editor not focused).
  insertSnippet: (text: string) => boolean;
  focus: () => void;
}

// ── Syntax highlight style (keywords purple, functions blue) ────────────────
const formulaHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#9333ea", fontWeight: "500" },
  { tag: tags.function(tags.variableName), color: "#2563eb" },
  { tag: tags.string, color: "#16a34a" },
  { tag: tags.number, color: "#0891b2" },
  { tag: tags.operator, color: "#64748b" },
  { tag: tags.variableName, color: "var(--tt-gray-900, #e2e8f0)" },
  { tag: tags.punctuation, color: "#94a3b8" },
]);

// ── prop("Name") -> icon + name pill ────────────────────────────────────────
class PropPillWidget extends WidgetType {
  private root: Root | null = null;
  readonly prop: DatabaseProperty;

  constructor(prop: DatabaseProperty) {
    super();
    this.prop = prop;
  }

  eq(other: PropPillWidget) {
    return (
      other.prop.id === this.prop.id &&
      other.prop.name === this.prop.name &&
      other.prop.config.type === this.prop.config.type
    );
  }

  toDOM() {
    const span = document.createElement("span");
    span.className = "formula-prop-pill";
    span.setAttribute("contenteditable", "false");

    const Icon = PROPERTY_TYPE_ICONS[this.prop.config.type];
    this.root = createRoot(span);
    this.root.render(
      <>
        <Icon size={12} className="formula-prop-pill__icon" />
        <span className="formula-prop-pill__name">{this.prop.name}</span>
      </>,
    );
    return span;
  }

  destroy() {
    const root = this.root;
    this.root = null;
    if (root) queueMicrotask(() => root.unmount());
  }
}

function buildPropDecorations(
  view: EditorView,
  getProperties: () => DatabaseProperty[],
): DecorationSet {
  const properties = getProperties();
  const widgets: Range<Decoration>[] = [];
  const re = /prop\(\s*(["'])(.*?)\1\s*\)/g;

  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const name = m[2];
      const prop = properties.find((p) => p.name === name);
      if (!prop) continue; // unresolved -> leave as plain text
      const start = from + m.index;
      const end = start + m[0].length;
      widgets.push(
        Decoration.replace({ widget: new PropPillWidget(prop) }).range(
          start,
          end,
        ),
      );
    }
    re.lastIndex = 0;
  }

  return Decoration.set(widgets, true);
}

function makePropPillPlugin(getProperties: () => DatabaseProperty[]) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = buildPropDecorations(view, getProperties);
      }
      update(u: ViewUpdate) {
        if (u.docChanged || u.viewportChanged) {
          this.decorations = buildPropDecorations(u.view, getProperties);
        }
      }
    },
    {
      decorations: (v) => v.decorations,
      provide: (plugin) =>
        EditorView.atomicRanges.of(
          (view) => view.plugin(plugin)?.decorations ?? Decoration.none,
        ),
    },
  );
}

const FormulaBar = forwardRef<FormulaBarHandle, FormulaBarProps>(
  function FormulaBar(
    { formula, properties, onChange, onDone, disabled },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);

    const propertiesRef = useRef(properties);
    useEffect(() => {
      propertiesRef.current = properties;
    }, [properties]);

    // Expose the focus-gated, caret-aware insert to the parent.
    useImperativeHandle(
      ref,
      () => ({
        insertSnippet(text: string) {
          const view = viewRef.current;
          if (!view) return false;
          // Focus guard: ignore inserts when the editor isn't focused, so
          // browsing the property/example panels doesn't mutate the formula.
          if (!view.hasFocus) return false;
          const { from, to } = view.state.selection.main;
          view.dispatch({
            changes: { from, to, insert: text },
            selection: { anchor: from + text.length },
            scrollIntoView: true,
          });
          // updateListener fires onChange since the doc changed.
          return true;
        },
        focus() {
          viewRef.current?.focus();
        },
      }),
      [],
    );

    useEffect(() => {
      if (!containerRef.current) return;

      const view = new EditorView({
        state: EditorState.create({
          doc: formula,
          extensions: [
            history(),
            keymap.of([
              ...defaultKeymap,
              ...historyKeymap,
              ...completionKeymap,
            ]),
            formulaLanguage,
            syntaxHighlighting(formulaHighlightStyle),
            makePropPillPlugin(() => propertiesRef.current),
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
                caretColor: "var(--tt-brand-color-400)",
              },
              ".cm-focused": { outline: "none" },
              ".cm-line": { padding: 0 },
              ".cm-placeholder": { color: "#aaa" },
              ".formula-prop-pill": {
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                padding: "0 6px",
                margin: "0 1px",
                borderRadius: "4px",
                background: "var(--tt-gray-100, rgba(255,255,255,0.08))",
                border:
                  "1px solid var(--tt-border-color, rgba(255,255,255,0.12))",
                fontFamily: "var(--tt-font-family, sans-serif)",
                fontSize: "12px",
                lineHeight: "1.7",
                verticalAlign: "baseline",
                whiteSpace: "nowrap",
                cursor: "default",
                userSelect: "none",
              },
              ".formula-prop-pill__icon": {
                width: "12px",
                height: "12px",
                opacity: "0.8",
                flexShrink: "0",
              },
              ".formula-prop-pill__name": {
                fontWeight: "500",
              },
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

    // Sync external formula changes (e.g. programmatic resets) into the editor.
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
      <CardItemGroup className="formula-bar">
        <CardItemGroup className="formula-bar__header" orientation="horizontal">
          <span className="formula-label">Formula</span>
          <Spacer orientation="horizontal" />
          <Button
            variant="primary"
            size="small"
            onClick={onDone}
            disabled={disabled}
          >
            Done
          </Button>
        </CardItemGroup>
        <div ref={containerRef} className="formula-bar__editor" />
      </CardItemGroup>
    );
  },
);

export default FormulaBar;
