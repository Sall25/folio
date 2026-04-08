/**
 * ExportButtons.tsx
 *
 * Drop-in toolbar buttons for PDF and Word export.
 * Place inside <ToolbarGroup> in your MainToolbarContent.
 *
 * Usage:
 *   import { ExportButtons } from "src/components/tiptap-ui/export-buttons";
 *   // Inside MainToolbarContent:
 *   <ExportButtons documentTitle="My Doc" />
 */

"use client";

import { useState } from "react";
import { useCurrentEditor } from "@tiptap/react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { exportToPdf, exportToWord } from "src/lib/export-utils.js";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { ArrowDownToLine, ChevronRight } from "lucide-react";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { Card } from "src/components/tiptap-ui-primitive/card";

// ── tiny SVG icons ──────────────────────────────────────────────────────────

function PdfIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="tiptap-button-icon"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="15" x2="15" y2="15" />
      <line x1="9" y1="11" x2="15" y2="11" />
    </svg>
  );
}

function WordIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="tiptap-button-icon"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <polyline points="8 13 10 18 12 13 14 18 16 13" />
    </svg>
  );
}

// ── component ───────────────────────────────────────────────────────────────

interface ExportButtonsProps {
  /** Used as the downloaded filename (no extension needed). Defaults to "document". */
  documentTitle?: string;
}

export function ExportButtons({
  documentTitle = "document",
}: ExportButtonsProps) {
  const { editor } = useCurrentEditor();
  const [exportingWord, setExportingWord] = useState(false);

  if (!editor) return null;

  const handlePdf = () => {
    exportToPdf(editor, documentTitle);
  };

  const handleWord = async () => {
    setExportingWord(true);
    try {
      await exportToWord(editor, documentTitle);
    } catch (err) {
      console.error("Word export failed:", err);
    } finally {
      setExportingWord(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" style={{ width: "100%" }}>
          <ArrowDownToLine className="tiptap-button-icon" />
          <span>Export</span>
          <Spacer orientation="horizontal" />
          <ChevronRight className="tiptap-button-icon" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="left" align="start">
        <Card
          style={{
            minWidth: "12rem",
            padding: "5px 10px",
          }}
        >
          <Button
            variant="ghost"
            onClick={handlePdf}
            aria-label="Export as PDF"
            title="Export as PDF"
            className="tiptap-button"
            style={{
              width: "100%",
            }}
          >
            <PdfIcon />
            <span
              className="tiptap-button-text"
              style={{ marginLeft: 4, fontSize: 12 }}
            >
              PDF
            </span>
          </Button>

          <Button
            variant="ghost"
            onClick={handleWord}
            disabled={exportingWord}
            aria-label="Export as Word document"
            title="Export as Word (.docx)"
            className="tiptap-button"
            style={{
              width: "100%",
            }}
          >
            <WordIcon />
            <span
              className="tiptap-button-text"
              style={{ marginLeft: 4, fontSize: 12 }}
            >
              {exportingWord ? "…" : "Word"}
            </span>
          </Button>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
