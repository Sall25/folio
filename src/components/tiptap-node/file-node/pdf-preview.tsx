import { lazy, Suspense } from "react";

// pdfjs-dist (~786KB) was being imported at module scope here, landing in the
// editor-create boot bundle even though a PDF preview only renders when a PDF
// file node mounts. The heavy component now lives in ./pdf-preview-canvas and
// loads on demand; this shim keeps the same public { PdfPreview } API so no
// caller needs to change.
const PdfPreviewCanvas = lazy(() =>
  import("./pdf-preview-canvas").then((m) => ({
    default: m.PdfPreviewCanvas,
  })),
);

export function PdfPreview({ url }: { url: string }) {
  return (
    <Suspense
      fallback={
        <div
          style={{
            width: "100%",
            aspectRatio: "1 / 1.3",
            borderRadius: "var(--tt-radius-md)",
            background: "var(--tt-gray-light-a-100, rgba(0,0,0,0.04))",
          }}
        />
      }
    >
      <PdfPreviewCanvas url={url} />
    </Suspense>
  );
}
