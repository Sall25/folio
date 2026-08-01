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
import "./math-block-node-view.scss";

function renderKatex(latex: string): { html: string; error: string | null } {
  if (!latex.trim()) return { html: "", error: null };
  try {
    const html = katex.renderToString(latex, {
      displayMode: true,
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

export function MathBlockNodeViewKatex({
  node,
  updateAttributes,
  selected,
}: NodeViewProps) {
  const latex = (node.attrs.latex as string) ?? "";
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(latex);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => textareaRef.current?.focus());
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
      as="div"
      data-type="math-block"
      className={`math-block${selected ? " math-block--selected" : ""}`}
    >
      <Popover
        open={open}
        onOpenChange={(v) => {
          if (!v) commit();
          setOpen(v);
        }}
      >
        <PopoverTrigger asChild>
          <div
            className={`math-block__display${isEmpty ? " math-block__display--empty" : ""}`}
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
              <span className="math-block__placeholder">
                <span className="math-block__placeholder-icon">√x</span>
                Add a TeX equation
              </span>
            ) : committed.error ? (
              <span className="math-block__error">{committed.error}</span>
            ) : (
              <span dangerouslySetInnerHTML={{ __html: committed.html }} />
            )}
          </div>
        </PopoverTrigger>

        <PopoverContent
          side="bottom"
          align="center"
          className="math-block__pop"
        >
          {draft.trim() !== "" && (
            <div className="math-block__preview">
              {preview.error ? (
                <span className="math-block__error-text">{preview.error}</span>
              ) : (
                <span dangerouslySetInnerHTML={{ __html: preview.html }} />
              )}
            </div>
          )}

          <div className="math-block__input-row">
            <textarea
              ref={textareaRef}
              className="math-block__input"
              value={draft}
              spellCheck={false}
              placeholder="E = mc^2"
              rows={1}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  close();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  close();
                }
              }}
            />
            <button
              type="button"
              className="math-block__done"
              onMouseDown={(e) => e.preventDefault()}
              onClick={close}
            >
              Done <kbd>↵</kbd>
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </NodeViewWrapper>
  );
}
