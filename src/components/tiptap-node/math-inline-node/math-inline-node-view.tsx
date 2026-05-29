import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import { useEffect, useMemo, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import "./math-inline-node-view.scss";

function renderKatex(latex: string): { html: string; error: string | null } {
  if (!latex.trim()) return { html: "", error: null };
  try {
    const html = katex.renderToString(latex, {
      displayMode: false,
      throwOnError: true,
      errorColor: "var(--tt-color-red-base)",
    });
    return { html, error: null };
  } catch (e) {
    return {
      html: "",
      error: e instanceof Error ? e.message : "Invalid LaTeX",
    };
  }
}

export function MathInlineNodeView({
  node,
  updateAttributes,
  selected,
}: NodeViewProps) {
  const latex = (node.attrs.latex as string) ?? "";
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(latex);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      //     setDraft(latex);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, latex]);

  const committed = useMemo(() => renderKatex(latex), [latex]);
  const preview = useMemo(() => renderKatex(draft), [draft]);

  function commit() {
    if (draft !== latex) updateAttributes({ latex: draft });
  }
  function close() {
    commit();
    setOpen(false);
  }

  const isEmpty = !latex.trim();

  return (
    <NodeViewWrapper
      as="span"
      data-type="math-inline"
      className={`math-inline${selected ? " math-inline--selected" : ""}`}
    >
      <Popover
        open={open}
        onOpenChange={(v) => {
          if (!v) commit();
          setOpen(v);
        }}
      >
        <PopoverTrigger asChild>
          <span
            className={`math-inline__display${isEmpty ? " math-inline__display--empty" : ""}`}
            contentEditable={false}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpen(true);
              }
            }}
          >
            {isEmpty ? (
              <span className="math-inline__placeholder">new equation</span>
            ) : committed.error ? (
              <span className="math-inline__error">⚠</span>
            ) : (
              <span dangerouslySetInnerHTML={{ __html: committed.html }} />
            )}
          </span>
        </PopoverTrigger>

        <PopoverContent
          side="bottom"
          align="center"
          className="math-inline__pop"
        >
          <div className="math-inline__preview">
            {draft.trim() === "" ? (
              <span className="math-inline__preview-empty">Preview</span>
            ) : preview.error ? (
              <span className="math-inline__error-text">{preview.error}</span>
            ) : (
              <span dangerouslySetInnerHTML={{ __html: preview.html }} />
            )}
          </div>
          <input
            ref={inputRef}
            className="math-inline__input"
            value={draft}
            spellCheck={false}
            placeholder="E = mc^2"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") {
                e.preventDefault();
                close();
              }
            }}
          />
        </PopoverContent>
      </Popover>
    </NodeViewWrapper>
  );
}
