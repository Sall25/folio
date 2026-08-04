import { useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { RenderTask } from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export function PdfPreviewCanvas({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    const loadingTask = pdfjsLib.getDocument(url);
    // let pdf: PDFDocumentProxy | null = null;
    let renderTask: RenderTask | null = null;

    loadingTask.promise
      .then((doc) => {
        // Torn down while the document was still loading: destroy it now so the
        // worker doesn't keep the parsed PDF in native memory.
        if (cancelled) {
          doc.destroy();
          return;
        }

        return doc.getPage(1);
      })
      .then((page) => {
        if (!page || cancelled || !canvasRef.current) return;
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        renderTask = page.render({
          canvasContext: canvas.getContext("2d")!,
          viewport,
          canvas,
        });
        return renderTask.promise;
      })
      .catch(() => {
        // getDocument / render reject on cancel — nothing to handle.
      });

    return () => {
      cancelled = true;
      renderTask?.cancel();
      // Frees the worker-side document (fonts, decoded images, operator lists)
      // and aborts an in-flight load. Without this, every re-run of the effect
      // leaks a whole PDF into native memory — invisible to the JS heap snapshot.
      loadingTask.destroy().catch(() => {});
      renderTask = null;
    };
  }, [url]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", borderRadius: "var(--tt-radius-md)" }}
    />
  );
}
