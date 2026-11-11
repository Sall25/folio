import { useCallback, useEffect, useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { Copy, Maximize2, Monitor, RotateCcw } from "src/components/icons";
import type { LiveCodeAttrs, LiveCodeLayout } from "./live-code-node";
import { LiveCodeEditor, type LiveCodeLanguage } from "./live-code-editor";
import { liveCodeDocument } from "./live-code-document";
import { dropCopy, loadCopy, saveCopy, type LiveCodeCopy } from "./live-code-copy";
import "./live-code-node.scss";

const TABS: { id: LiveCodeLanguage; file: string }[] = [
  { id: "html", file: "index.html" },
  { id: "css", file: "style.css" },
  { id: "js", file: "script.js" },
];

/** How long after the last change the result re-runs. */
const RUN_DELAY = 350;
/** How long after the last keystroke the code is saved to the page (and so
 *  reaches everyone watching). */
const SAVE_DELAY = 150;

interface ConsoleLine {
  level: string;
  text: string;
}

const newChannel = () => Math.random().toString(36).slice(2);

export function LiveCodeView({ node, updateAttributes, editor }: NodeViewProps) {
  const { t } = useTranslation();
  const a = node.attrs as LiveCodeAttrs;
  const canEdit = editor.isEditable;
  const wrapper = useRef<HTMLDivElement>(null);

  // A block pasted in without an id gets one (readers' copies are kept by it).
  useEffect(() => {
    if (canEdit && !a.blockId)
      updateAttributes({
        blockId: crypto.randomUUID?.() ?? `lc_${Date.now()}`,
      });
  }, [canEdit, a.blockId, updateAttributes]);

  const [tab, setTab] = useState<LiveCodeLanguage>(
    a.html || !a.css ? "html" : "css",
  );
  const [viewport, setViewport] = useState<"desktop" | "phone">("desktop");

  // Readers: "Try it myself" — their own copy, on their device.
  const [copy, setCopy] = useState<LiveCodeCopy | null>(null);
  const trying = !canEdit && copy != null;

  // What the editors show: the lesson's code, or the reader's copy. Edits by
  // someone who can edit the page are kept locally a moment, then saved.
  const [draft, setDraft] = useState<Partial<LiveCodeCopy>>({});
  const code: LiveCodeCopy = trying
    ? copy
    : {
        html: draft.html ?? a.html,
        css: draft.css ?? a.css,
        js: draft.js ?? a.js,
      };

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Partial<LiveCodeCopy>>({});
  const flush = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    const next = pending.current;
    pending.current = {};
    if (Object.keys(next).length) updateAttributes(next);
  }, [updateAttributes]);
  useEffect(() => () => flush(), [flush]);

  // Once the page has our change, the draft isn't needed.
  const { html: savedHtml, css: savedCss, js: savedJs } = a;
  useEffect(() => {
    const saved = { html: savedHtml, css: savedCss, js: savedJs };
    setDraft((d) => {
      const left = { ...d };
      (["html", "css", "js"] as const).forEach((k) => {
        if (left[k] === saved[k] && !(k in pending.current)) delete left[k];
      });
      return Object.keys(left).length === Object.keys(d).length ? d : left;
    });
  }, [savedHtml, savedCss, savedJs]);

  const onEdit = (lang: LiveCodeLanguage, value: string) => {
    if (trying) {
      const next = { ...copy, [lang]: value };
      setCopy(next);
      if (a.blockId) saveCopy(a.blockId, next);
      return;
    }
    if (!canEdit) return;
    setDraft((d) => ({ ...d, [lang]: value }));
    pending.current = { ...pending.current, [lang]: value };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, SAVE_DELAY);
  };

  // Readers see when the code is changing under them.
  const [typing, setTyping] = useState(false);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (canEdit) return;
    // In a callback, not the effect body: one render per change, after it.
    const on = setTimeout(() => setTyping(true), 0);
    const off = setTimeout(() => setTyping(false), 2000);
    return () => {
      clearTimeout(on);
      clearTimeout(off);
    };
  }, [savedHtml, savedCss, savedJs, canEdit]);

  // ── The result ────────────────────────────────────────────────────────────
  const [channel] = useState(newChannel);
  const frame = useRef<HTMLIFrameElement>(null);
  const [srcDoc, setSrcDoc] = useState(() =>
    liveCodeDocument(code.html, code.css, code.js, channel),
  );
  const [logs, setLogs] = useState<ConsoleLine[]>([]);
  useEffect(() => {
    const id = setTimeout(() => {
      setLogs([]);
      setSrcDoc(liveCodeDocument(code.html, code.css, code.js, channel));
    }, RUN_DELAY);
    return () => clearTimeout(id);
  }, [code.html, code.css, code.js, channel]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { source?: string; channel?: string; level?: string; text?: string };
      if (
        e.source !== frame.current?.contentWindow ||
        d?.source !== "folio-live-code" ||
        d.channel !== channel
      )
        return;
      setLogs((l) => [...l.slice(-49), { level: d.level ?? "log", text: String(d.text ?? "") }]);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [channel]);

  const layout: LiveCodeLayout = a.layout ?? "split";
  const setLayout = (l: LiveCodeLayout) => canEdit && updateAttributes({ layout: l });

  const [copied, setCopied] = useState(false);
  const copyTab = () => {
    void navigator.clipboard
      .writeText(code[tab])
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      })
      .catch(() => {});
  };

  const present = () => {
    const el = wrapper.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.().catch(() => {});
  };

  const showCode = layout !== "result";
  const hasJs = !!code.js.trim();

  return (
    <NodeViewWrapper
      ref={wrapper}
      className="live-code"
      data-layout={layout}
      contentEditable={false}
    >
      <div className="live-code__bar">
        {showCode &&
          TABS.map((x) => (
            <button
              key={x.id}
              type="button"
              className="live-code__tab"
              data-on={tab === x.id || undefined}
              aria-pressed={tab === x.id}
              onClick={() => setTab(x.id)}
            >
              {x.file}
            </button>
          ))}
        <span className="live-code__spacer" />

        {!canEdit && typing && !trying && (
          <span className="live-code__live">
            <span className="live-code__dot" aria-hidden />
            {t("liveCode.typing")}
          </span>
        )}
        {trying && <span className="live-code__badge">{t("liveCode.yourCopy")}</span>}

        {canEdit && (
          <div className="live-code__layouts" role="group" aria-label={t("liveCode.layout")}>
            {(["split", "stacked", "result"] as const).map((l) => (
              <button
                key={l}
                type="button"
                data-on={layout === l || undefined}
                aria-pressed={layout === l}
                onClick={() => setLayout(l)}
              >
                {t(`liveCode.layouts.${l}`)}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          className="live-code__icon"
          aria-label={t("liveCode.present")}
          title={t("liveCode.present")}
          onClick={present}
        >
          <Maximize2 size={14} />
        </button>
      </div>

      <div className="live-code__body">
        {showCode && (
          <div className="live-code__code">
            <LiveCodeEditor
              key={tab}
              language={tab}
              value={code[tab]}
              readOnly={!canEdit && !trying}
              onChange={(v) => onEdit(tab, v)}
              label={TABS.find((x) => x.id === tab)!.file}
            />
          </div>
        )}

        <div className="live-code__result">
          <div className="live-code__result-bar">
            <span>{t("liveCode.result")}</span>
            <span className="live-code__viewports">
              <button
                type="button"
                data-on={viewport === "desktop" || undefined}
                onClick={() => setViewport("desktop")}
              >
                <Monitor size={12} aria-hidden />
                {t("liveCode.desktop")}
              </button>
              <button
                type="button"
                data-on={viewport === "phone" || undefined}
                onClick={() => setViewport("phone")}
              >
                375 px
              </button>
            </span>
          </div>
          <div className="live-code__frame-box" data-viewport={viewport}>
            <iframe
              ref={frame}
              className="live-code__frame"
              title={t("liveCode.result")}
              // Scripts run, nothing else: no access to Folio (no same
              // origin), no forms, no popups, no navigation of the page.
              sandbox="allow-scripts"
              srcDoc={srcDoc}
            />
          </div>
          {(hasJs || logs.length > 0) && (
            <div className="live-code__console" aria-live="polite">
              {logs.length === 0 ? (
                <span className="live-code__muted">{t("liveCode.noConsole")}</span>
              ) : (
                logs.map((l, i) => (
                  <div key={i} className="live-code__log" data-level={l.level}>
                    {l.text}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {!canEdit && (
        <div className="live-code__reader">
          {trying ? (
            <>
              <button
                type="button"
                className="live-code__primary"
                onClick={() => setCopy(null)}
              >
                {t("liveCode.backToLesson")}
              </button>
              <button
                type="button"
                className="live-code__secondary"
                onClick={() => {
                  const fresh = { html: a.html, css: a.css, js: a.js };
                  setCopy(fresh);
                  if (a.blockId) saveCopy(a.blockId, fresh);
                }}
              >
                <RotateCcw size={14} aria-hidden />
                {t("liveCode.reset")}
              </button>
              <button
                type="button"
                className="live-code__secondary"
                onClick={() => {
                  if (a.blockId) dropCopy(a.blockId);
                  setCopy(null);
                }}
              >
                {t("liveCode.discard")}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="live-code__primary"
                onClick={() => {
                  const mine =
                    (a.blockId && loadCopy(a.blockId)) || {
                      html: a.html,
                      css: a.css,
                      js: a.js,
                    };
                  setCopy(mine);
                  if (a.blockId) saveCopy(a.blockId, mine);
                }}
              >
                {t("liveCode.tryIt")}
              </button>
              <button type="button" className="live-code__secondary" onClick={copyTab}>
                <Copy size={14} aria-hidden />
                {copied ? t("liveCode.copied") : t("liveCode.copy")}
              </button>
            </>
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
}
