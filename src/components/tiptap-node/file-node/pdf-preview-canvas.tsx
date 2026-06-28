import { useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export function PdfPreviewCanvas({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;

    pdfjsLib.getDocument(url).promise.then((pdf) => {
      if (cancelled) return;
      pdf.getPage(1).then((page) => {
        if (cancelled || !canvasRef.current) return;
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        page.render({
          canvasContext: canvas.getContext("2d")!,
          viewport,
          canvas,
        });
      });
    });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", borderRadius: "var(--tt-radius-md)" }}
    />
  );
}
