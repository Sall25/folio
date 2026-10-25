/**
 * ExportButtons.tsx
 *
 * Drop-in toolbar buttons for PDF, Word and Markdown export.
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
import {
  exportToMarkdown,
  exportToPdf,
  exportToWord,
} from "src/lib/export-utils.js";
import { useTranslation } from "react-i18next";
import { useActiveEditor } from "src/features/editor/context/active-editor-store";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { ArrowDownToLine, ChevronRight } from "src/components/icons";
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

function MarkdownIcon() {
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
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <polyline points="6 15 6 9 9 12 12 9 12 15" />
      <polyline points="15 12 17 14 19 12" />
      <line x1="17" y1="9" x2="17" y2="14" />
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
  // The page menu sits outside the editor's provider: fall back to the
  // open page's editor.
  const { editor: contextEditor } = useCurrentEditor();
  const activeEditor = useActiveEditor();
  const editor = contextEditor ?? activeEditor;
  const { t } = useTranslation();
  const [exportingWord, setExportingWord] = useState(false);

  if (!editor) return null;

  const handlePdf = () => {
    exportToPdf(editor, documentTitle);
  };

  const handleMarkdown = () => {
    exportToMarkdown(editor, documentTitle).catch((err) =>
      console.error("Markdown export failed:", err),
    );
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
          <span>{t("export.label")}</span>
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
            aria-label={t("export.pdfAria")}
            title={t("export.pdfHint")}
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
            aria-label={t("export.wordAria")}
            title={t("export.wordAria")}
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

          <Button
            variant="ghost"
            onClick={handleMarkdown}
            aria-label={t("export.markdownAria")}
            title={t("export.markdownAria")}
            className="tiptap-button"
            style={{
              width: "100%",
            }}
          >
            <MarkdownIcon />
            <span
              className="tiptap-button-text"
              style={{ marginLeft: 4, fontSize: 12 }}
            >
              Markdown
            </span>
          </Button>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
