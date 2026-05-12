import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useCallback, useRef, useState } from "react";
import { Check, ChevronDown, Copy } from "lucide-react";
import "./code-block-node.scss";

const LANGUAGES = [
  "plaintext", "javascript", "typescript", "jsx", "tsx",
  "html", "css", "scss", "json", "markdown", "python",
  "rust", "go", "java", "c", "cpp", "bash", "sql", "yaml", "xml",
];

export function CodeBlockView({ node, updateAttributes, extension }: NodeViewProps) {
  const { filename, language } = node.attrs;
  const [copied, setCopied] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const filenameRef = useRef<HTMLSpanElement>(null);

  const currentLang = language ?? extension.options.defaultLanguage ?? "plaintext";

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
    if (e.key === "Enter") { e.preventDefault(); filenameRef.current?.blur(); }
  }, []);

  return (
    <NodeViewWrapper className="code-block-wrapper">
      {filename !== null && (
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
      )}

      {/* Toolbar — shown on hover via CSS */}
      <div className="code-block-toolbar" contentEditable={false}>
        <div className="code-block-lang-wrap">
          <button className="code-block-pill" onClick={() => setLangOpen((o) => !o)}>
            <span>{currentLang}</span>
            <ChevronDown size={11} />
          </button>
          {langOpen && (
            <div className="code-block-lang-dropdown">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  className={lang === currentLang ? "active" : ""}
                  onClick={() => { updateAttributes({ language: lang }); setLangOpen(false); }}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="code-block-pill" onClick={handleCopy}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>

      <pre>
        <NodeViewContent as={"code" as unknown as "div"} />
      </pre>
    </NodeViewWrapper>
  );
}