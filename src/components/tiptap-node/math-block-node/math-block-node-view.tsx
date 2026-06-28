import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import { lazy, Suspense } from "react";

// katex (~584KB incl. CSS) was imported at module scope in the full view,
// landing in the editor-create boot bundle even though it's only needed to
// RENDER a math node. The heavy view now lives in
// ./math-block-node-view-katex and loads when the first math node mounts.
// This shim keeps the same { MathBlockNodeView } API so the extension's
// addNodeView is unchanged. Shares the katex chunk with the inline view.
const MathBlockNodeViewKatex = lazy(() =>
  import("./math-block-node-view-katex").then((m) => ({
    default: m.MathBlockNodeViewKatex,
  })),
);

export function MathBlockNodeView(props: NodeViewProps) {
  const latex = (props.node.attrs.latex as string) ?? "";
  const isEmpty = !latex.trim();

  // Fallback during the brief chunk load — no katex import, zero boot weight.
  // Shows raw LaTeX (or the empty-state label) so an existing equation doesn't
  // flash blank before KaTeX arrives.
  return (
    <Suspense
      fallback={
        <NodeViewWrapper as="div" data-type="math-block" className="math-block">
          <div className="math-block__display" contentEditable={false}>
            {isEmpty ? (
              <span className="math-block__placeholder">
                Add a TeX equation
              </span>
            ) : (
              <span style={{ opacity: 0.5, fontFamily: "monospace" }}>
                {latex}
              </span>
            )}
          </div>
        </NodeViewWrapper>
      }
    >
      <MathBlockNodeViewKatex {...props} />
    </Suspense>
  );
}
