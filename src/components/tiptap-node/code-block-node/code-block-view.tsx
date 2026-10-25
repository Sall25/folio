import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  ListOrdered,
  WrapText,
} from "src/components/icons";
import "./code-block-node.scss";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Card, CardBody } from "src/components/tiptap-ui-primitive/card";
import { languageLabel, searchLanguages } from "./languages";

// ── Language picker: search, arrow keys, Enter ─────────────────────────────

function LanguagePicker({
  current,
  onPick,
}: {
  current: string;
  onPick: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const results = searchLanguages(query);
  const [active, setActive] = useState(() =>
    Math.max(
      0,
      results.findIndex((l) => l.id === current),
    ),
  );
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the highlighted language in view while moving with the arrows.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <Card className="code-block-lang-card">
      <CardBody className="code-block-lang-body">
        <input
          className="code-block-lang-search"
          placeholder="Search languages…"
          value={query}
          autoFocus
          aria-label="Search languages"
          aria-controls="code-block-lang-list"
          aria-activedescendant={
            results[active] ? `code-lang-${results[active].id}` : undefined
          }
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(results.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (results[active]) onPick(results[active].id);
            }
          }}
        />
        <div
          ref={listRef}
          id="code-block-lang-list"
          role="listbox"
          className="code-block-lang-list"
        >
          {results.length === 0 && (
            <div className="code-block-lang-empty">No language found</div>
          )}
          {results.map((lang, i) => (
            <Button
              key={lang.id}
              id={`code-lang-${lang.id}`}
              role="option"
              aria-selected={lang.id === current}
              data-index={i}
              variant="ghost"
              className={`code-block-lang-option${i === active ? " is-active" : ""}`}
              data-active-state={lang.id === current ? "on" : "off"}
              onMouseEnter={() => setActive(i)}
              onClick={() => onPick(lang.id)}
            >
              <span className="tiptap-button-text">{lang.label}</span>
              {lang.id === current && <Check className="tiptap-button-icon" />}
            </Button>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

// ── Code block ──────────────────────────────────────────────────────────────

export const CodeBlockView = memo(function CodeBlockView({
  node,
  updateAttributes,
  extension,
  editor,
}: NodeViewProps) {
  const { filename, language, lineNumbers, wrap } = node.attrs;
  const [copied, setCopied] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const editable = editor.isEditable;

  const currentLang =
    language ?? extension.options.defaultLanguage ?? "plaintext";

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(node.textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [node.textContent]);

  const lineCount = node.textContent.split("\n").length;
  const showToolbar = langOpen || hovered;

  return (
    <NodeViewWrapper
      className={[
        "code-block-wrapper",
        lineNumbers ? "has-line-numbers" : "",
        wrap ? "is-wrapped" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          // Gutter wide enough for the biggest line number.
          "--code-gutter": `${String(lineCount).length + 1}ch`,
        } as React.CSSProperties
      }
      onMouseOver={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* A text field: a contentEditable here would fight ProseMirror for
          the selection. */}
      {filename !== null && (
        <input
          className="code-block-filename"
          contentEditable={false}
          value={filename ?? ""}
          placeholder="Untitled"
          spellCheck={false}
          readOnly={!editable}
          onChange={(e) => updateAttributes({ filename: e.target.value })}
          onBlur={(e) => {
            if (!e.target.value.trim()) updateAttributes({ filename: null });
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
      )}

      <div
        className="code-block-toolbar"
        contentEditable={false}
        style={{
          opacity: showToolbar ? 1 : 0,
          pointerEvents: showToolbar ? "all" : "none",
          transition: "opacity 0.2s ease",
        }}
      >
        {editable ? (
          <Popover open={langOpen} onOpenChange={setLangOpen}>
            <PopoverTrigger asChild>
              <button
                className="code-block-pill code-block-lang-pill"
                aria-label={`Language: ${languageLabel(currentLang)}. Change`}
              >
                <span>{languageLabel(currentLang)}</span>
                <ChevronDown size={11} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end">
              {langOpen && (
                <LanguagePicker
                  current={currentLang}
                  onPick={(id) => {
                    updateAttributes({ language: id });
                    setLangOpen(false);
                  }}
                />
              )}
            </PopoverContent>
          </Popover>
        ) : (
          <span className="code-block-pill code-block-lang-pill is-static">
            {languageLabel(currentLang)}
          </span>
        )}

        {editable && (
          <>
            <button
              className="code-block-pill code-block-icon-pill"
              data-active={lineNumbers ? "on" : "off"}
              aria-pressed={!!lineNumbers}
              aria-label="Line numbers"
              title="Line numbers"
              onClick={() => updateAttributes({ lineNumbers: !lineNumbers })}
            >
              <ListOrdered size={13} />
            </button>
            <button
              className="code-block-pill code-block-icon-pill"
              data-active={wrap ? "on" : "off"}
              aria-pressed={!!wrap}
              aria-label="Wrap long lines"
              title="Wrap long lines"
              onClick={() => updateAttributes({ wrap: !wrap })}
            >
              <WrapText size={13} />
            </button>
          </>
        )}

        <button
          className="code-block-pill code-block-copy-pill"
          onClick={handleCopy}
        >
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
