import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  NodeViewContent,
  type NodeViewProps,
} from "@tiptap/react";
import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import {
  TabList,
  TabItem,
  TabAddButton,
} from "src/components/tiptap-ui-primitive/tabs/tabs";
import "./code-group-node.scss";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    codeGroup: {
      /** Insert a tabbed multi-language code block. */
      insertCodeGroup: () => ReturnType;
    };
  }
}

// ── page-global preferred code language (reader preference, not doc data) ──────
type LangListener = (lang: string | null) => void;
let _lang: string | null | undefined;
const _listeners = new Set<LangListener>();

// eslint-disable-next-line react-refresh/only-export-components
export const codeLangStore = {
  get(): string | null {
    if (_lang === undefined) {
      try {
        _lang = localStorage.getItem("folio:code-lang");
      } catch {
        _lang = null;
      }
    }
    return _lang ?? null;
  },
  set(lang: string | null) {
    _lang = lang;
    try {
      if (lang) localStorage.setItem("folio:code-lang", lang);
    } catch {
      /* ignore */
    }
    _listeners.forEach((l) => l(_lang ?? null));
  },
  subscribe(l: LangListener) {
    _listeners.add(l);
    return () => {
      _listeners.delete(l);
    };
  },
};

function useSyncedLang() {
  const [lang, setLang] = useState<string | null>(() => codeLangStore.get());
  useEffect(() => codeLangStore.subscribe(setLang), []);
  return lang;
}

// which language should a group show: the synced one if it has it, else its first
function targetLang(langs: string[], sync: string | null): string | undefined {
  if (sync && langs.includes(sync)) return sync;
  return langs[0];
}

const LANG_LABELS: Record<string, string> = {
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  jsx: "JSX",
  tsx: "TSX",
  py: "Python",
  python: "Python",
  bash: "Bash",
  sh: "Shell",
  shell: "Shell",
  zsh: "Shell",
  curl: "cURL",
  json: "JSON",
  yaml: "YAML",
  go: "Go",
  rust: "Rust",
  java: "Java",
  kotlin: "Kotlin",
  swift: "Swift",
  php: "PHP",
  ruby: "Ruby",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  sql: "SQL",
  text: "Text",
};
const labelFor = (lang: string) =>
  LANG_LABELS[(lang || "").toLowerCase()] ??
  (lang ? lang.charAt(0).toUpperCase() + lang.slice(1) : "Code");

// ── one code panel ────────────────────────────────────────────────────────────
function CodeGroupItemView({ node, editor, getPos }: NodeViewProps) {
  const myLang = node.attrs.language as string;
  const [active, setActive] = useState(false);

  useEffect(() => {
    const compute = () => {
      try {
        const pos = typeof getPos === "function" ? getPos() : null;
        if (pos == null) return false;
        const parent = editor.state.doc.resolve(pos).parent;
        if (parent?.type?.name !== "codeGroup") return false;
        const langs: string[] = [];
        parent.forEach((c) => langs.push(c.attrs.language));
        return myLang === targetLang(langs, codeLangStore.get());
      } catch {
        return false;
      }
    };
    const update = () => setActive(compute());
    update();
    const off = codeLangStore.subscribe(update);
    editor.on("transaction", update);
    return () => {
      off();
      editor.off("transaction", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, getPos, myLang]);

  return (
    <NodeViewWrapper
      as="div"
      className="code-group__item"
      data-language={myLang}
      style={{ display: active ? "block" : "none" }}
    >
      <NodeViewContent />
    </NodeViewWrapper>
  );
}

// ── the group ─────────────────────────────────────────────────────────────────
function CodeGroupView({ node, editor, getPos }: NodeViewProps) {
  const sync = useSyncedLang(); // re-render this group when the global pref changes
  const [copied, setCopied] = useState(false);

  const base = typeof getPos === "function" ? getPos() : null;

  const items: { language: string; pos: number; size: number; text: string }[] =
    [];
  node.forEach((child, offset) => {
    items.push({
      language: child.attrs.language,
      pos: base != null ? base + 1 + offset : -1,
      size: child.nodeSize,
      text: child.textContent,
    });
  });

  const langs = items.map((i) => i.language);
  const target = targetLang(langs, sync);
  const activeText = items.find((i) => i.language === target)?.text ?? "";

  const copy = () => {
    try {
      navigator.clipboard?.writeText(activeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  const addItem = () => {
    if (base == null) return;
    const end = base + node.nodeSize - 1;
    editor
      .chain()
      .focus()
      .insertContentAt(end, {
        type: "codeGroupItem",
        attrs: { language: "text" },
        content: [
          { type: "codeBlock", attrs: { language: "text" }, content: [] },
        ],
      })
      .run();
  };

  const removeItem = (pos: number, size: number) => {
    if (node.childCount <= 1) return;
    editor
      .chain()
      .focus()
      .deleteRange({ from: pos, to: pos + size })
      .run();
  };

  const renameLang = (pos: number, value: string) => {
    const lang = value.trim() || "text";
    editor
      .chain()
      .command(({ tr, state }) => {
        // panel language (tab label + sync key)
        tr.setNodeAttribute(pos, "language", lang);
        // keep the inner code block's highlight language in sync — but only if
        // that node actually exposes a `language` attr, so this stays safe on
        // any code block whose schema differs.
        const item = state.doc.resolve(pos).nodeAfter;
        const code = item?.firstChild;
        if (code && "language" in code.attrs) {
          tr.setNodeAttribute(pos + 1, "language", lang);
        }
        return true;
      })
      .run();
  };

  return (
    <NodeViewWrapper as="div" className="code-group" data-type="codeGroup">
      <div className="code-group__headers" contentEditable={false}>
        <TabList aria-label="Code languages">
          {items.map((it) => (
            <TabItem
              key={`${it.language}-${it.pos}`}
              label={labelFor(it.language)}
              active={it.language === target}
              onSelect={() => codeLangStore.set(it.language)}
              onRename={(v) => renameLang(it.pos, v)}
              onClose={
                items.length > 1 ? () => removeItem(it.pos, it.size) : undefined
              }
            />
          ))}
          <TabAddButton onClick={addItem} />
        </TabList>

        <button
          type="button"
          className="code-group__copy"
          aria-label="Copy code"
          onClick={copy}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>

      <NodeViewContent className="code-group__panels" />
    </NodeViewWrapper>
  );
}

// ── nodes ─────────────────────────────────────────────────────────────────────
export const CodeGroupItem = Node.create({
  name: "codeGroupItem",
  content: "codeBlock", // exactly one code block per panel
  isolating: true,
  defining: true,
  selectable: false,

  addAttributes() {
    return {
      language: { default: "text" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="codeGroupItem"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "codeGroupItem" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeGroupItemView);
  },
});

export const CodeGroup = Node.create({
  name: "codeGroup",
  group: "block",
  content: "codeGroupItem+",
  isolating: true,
  draggable: true,

  parseHTML() {
    return [{ tag: 'div[data-type="codeGroup"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "codeGroup" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeGroupView);
  },

  addCommands() {
    return {
      insertCodeGroup:
        () =>
        ({ chain }) => {
          const mk = (language: string) => ({
            type: "codeGroupItem",
            attrs: { language },
            content: [{ type: "codeBlock", attrs: { language }, content: [] }],
          });
          return chain()
            .insertContent({
              type: "codeGroup",
              content: [mk("javascript"), mk("python"), mk("bash")],
            })
            .run();
        },
    };
  },
});
