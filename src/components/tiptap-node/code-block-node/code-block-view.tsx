// code-block-view.tsx
import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { useCallback, useRef, useState } from "react";
import { Check, ChevronDown, Copy } from "lucide-react";
import "./code-block-node.scss";

const LANGUAGES = [
  "plaintext",
  "javascript",
  "typescript",
  "jsx",
  "tsx",
  "html",
  "css",
  "scss",
  "json",
  "markdown",
  "python",
  "rust",
  "go",
  "java",
  "c",
  "cpp",
  "bash",
  "sql",
  "yaml",
  "xml",
];

export function CodeBlockView({
  node,
  updateAttributes,
  extension,
}: NodeViewProps) {
  const { filename, language } = node.attrs;
  const [copied, setCopied] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const filenameRef = useRef<HTMLSpanElement>(null);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(node.textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [node.textContent]);

  const handleFilenameBlur = useCallback(() => {
    const text = filenameRef.current?.textContent?.trim() ?? "";
    updateAttributes({ filename: text || null });
  }, [updateAttributes]);

  const handleFilenameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      filenameRef.current?.blur();
    }
  }, []);

  const currentLang =
    language ?? extension.options.defaultLanguage ?? "plaintext";

  return (
    <NodeViewWrapper className="code-block-wrapper">
      {/* Header */}
      <div className="code-block-header" contentEditable={false}>
        {/* Filename tab */}
        <div className="code-block-filename-tab">
          <span
            ref={filenameRef}
            className="code-block-filename"
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            onBlur={handleFilenameBlur}
            onKeyDown={handleFilenameKeyDown}
            data-placeholder="Untitled"
          >
            {filename ?? ""}
          </span>
        </div>

        {/* Right actions */}
        <div className="code-block-actions">
          {/* Language selector */}
          <div className="code-block-lang-selector">
            <button
              className="code-block-lang-btn"
              onClick={() => setLangOpen((o) => !o)}
            >
              <span>{currentLang}</span>
              <ChevronDown size={12} />
            </button>
            {langOpen && (
              <div className="code-block-lang-dropdown">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    className={`code-block-lang-option ${lang === currentLang ? "active" : ""}`}
                    onClick={() => {
                      updateAttributes({ language: lang });
                      setLangOpen(false);
                    }}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Copy button */}
          <button className="code-block-copy-btn" onClick={handleCopy}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>

          {/* More options */}
          <button className="code-block-more-btn">
            <span>···</span>
          </button>
        </div>
      </div>

      {/* Code content */}
      <pre>
        <NodeViewContent as={"code" as unknown as "div"} />
      </pre>
    </NodeViewWrapper>
  );
}
