import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { useCallback, useRef, useState, memo } from "react";
import { Check, ChevronDown, Copy } from "lucide-react";
import "./code-block-node.scss";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Card, CardBody } from "src/components/tiptap-ui-primitive/card";

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

export const CodeBlockView = memo(function CodeBlockView({
  node,
  updateAttributes,
  extension,
}: NodeViewProps) {
  const { filename, language } = node.attrs;
  const [copied, setCopied] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const filenameRef = useRef<HTMLSpanElement>(null);

  const currentLang =
    language ?? extension.options.defaultLanguage ?? "plaintext";

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

  return (
    <NodeViewWrapper
      className="code-block-wrapper"
      onMouseOver={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
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

      <div
        className="code-block-toolbar"
        contentEditable={false}
        style={{
          opacity: langOpen || hovered ? 1 : 0,
          pointerEvents: langOpen || hovered ? "all" : "none",
          transition: "opacity 0.2s ease",
        }}
      >
        <div className="code-block-lang-wrap">
          <Popover open={langOpen} onOpenChange={setLangOpen}>
            <PopoverTrigger asChild>
              <button
                className="code-block-pill"
                onClick={() => setLangOpen((o) => !o)}
              >
                <span>{currentLang}</span>
                <ChevronDown size={11} />
              </button>
            </PopoverTrigger>
            <PopoverContent>
              <Card style={{ minWidth: 300 }}>
                <CardBody
                  style={{
                    maxHeight: 300,
                    width: "100%",
                    justifyContent: "flex-start",
                  }}
                >
                  {LANGUAGES.map((lang) => (
                    <Button
                      variant="ghost"
                      style={{ width: "100%", justifyContent: "flex-start" }}
                      data-active-state={lang === currentLang ? "on" : "off"}
                      key={lang}
                      onClick={() => {
                        updateAttributes({ language: lang });
                        setLangOpen(false);
                      }}
                    >
                      {lang}
                    </Button>
                  ))}
                </CardBody>
              </Card>
              {/* {langOpen && (
               
              )} */}
            </PopoverContent>
          </Popover>
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
});
