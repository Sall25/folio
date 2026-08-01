import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import { lazy, Suspense } from "react";

// katex (~584KB incl. CSS) was imported at module scope in the full view,
// landing in the editor-create boot bundle even though it's only needed to
// RENDER a math node. The heavy view (KaTeX + its CSS) now lives in
// ./math-inline-node-view-katex and loads when the first math node mounts.
// This shim keeps the same { MathInlineNodeView } API so the extension's
// addNodeView is unchanged.
const MathInlineNodeViewKatex = lazy(() =>
  import("./math-inline-node-view-katex").then((m) => ({
    default: m.MathInlineNodeViewKatex,
  })),
);

export function MathInlineNodeView(props: NodeViewProps) {
  const latex = (props.node.attrs.latex as string) ?? "";
  const isEmpty = !latex.trim();

  // Fallback: a non-KaTeX placeholder shown only during the brief chunk load.
  // Renders the raw LaTeX (or the empty-state label) so an existing equation
  // doesn't flash blank before KaTeX arrives. No katex import here, so this
  // path carries zero weight into boot.
  return (
    <Suspense
      fallback={
        <NodeViewWrapper
          as="span"
          data-type="math-inline"
          className="math-inline"
        >
          <span className="math-inline__display" contentEditable={false}>
            {isEmpty ? (
              <span className="math-inline__placeholder">new equation</span>
            ) : (
              <span style={{ opacity: 0.5, fontFamily: "monospace", cursor: 'pointer' }}>
                {latex}
              </span>
            )}
          </span>
        </NodeViewWrapper>
      }
    >
      <MathInlineNodeViewKatex {...props} />
    </Suspense>
  );
}
