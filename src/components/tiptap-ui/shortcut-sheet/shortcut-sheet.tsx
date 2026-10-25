import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Keyboard, Search, X } from "src/components/icons";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { isMac } from "src/lib/tiptap-utils";
import { SHORTCUT_SECTIONS, type Lang, type Shortcut } from "./shortcuts";
import {
  closeShortcutSheet,
  openShortcutSheet,
  useSheetOpen,
  useShortcutKey,
} from "./sheet-store";
import "./shortcut-sheet.scss";

// The keyboard shortcut sheet: Ctrl+/ (⌘/ on a Mac) anywhere, or
// "Keyboard shortcuts" in the page menu. Escape or a click outside closes it.
const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Keys({ shortcut, mac }: { shortcut: Shortcut; mac: boolean }) {
  if (shortcut.typed) {
    return <code className="shortcut-sheet__typed">{shortcut.typed}</code>;
  }
  const label = (k: string) =>
    k === "Mod"
      ? mac
        ? "⌘"
        : "Ctrl"
      : k === "Alt"
        ? mac
          ? "⌥"
          : "Alt"
        : k === "Shift"
          ? mac
            ? "⇧"
            : "Shift"
          : k === "Enter"
            ? "↵"
            : k;
  return (
    <span className="shortcut-sheet__keys">
      {(shortcut.keys ?? []).map((k, i) => (
        <kbd key={i}>{label(k)}</kbd>
      ))}
    </span>
  );
}

export function ShortcutSheet() {
  const isOpen = useSheetOpen();
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language?.startsWith("fr") ? "fr" : "en";
  const mac = useMemo(() => isMac(), []);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useShortcutKey();

  // Focus the search on open; give focus back (to the editor) on close.
  useEffect(() => {
    if (!isOpen) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => searchRef.current?.focus());
    return () => {
      cancelAnimationFrame(raf);
      returnFocusRef.current?.focus?.();
    };
  }, [isOpen]);

  const sections = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return SHORTCUT_SECTIONS;
    return SHORTCUT_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        normalize(
          `${item.label.en} ${item.label.fr} ${item.typed ?? ""} ${(item.keys ?? []).join(" ")}`,
        ).includes(q),
      ),
    })).filter((section) => section.items.length > 0);
  }, [query]);

  if (!isOpen) return null;

  const close = () => {
    setQuery("");
    closeShortcutSheet();
  };

  return createPortal(
    <div
      className="shortcut-sheet__overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="shortcut-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-sheet-title"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            close();
          }
        }}
      >
        <header className="shortcut-sheet__header">
          <Keyboard size={18} />
          <h2 id="shortcut-sheet-title">{t("shortcuts.title")}</h2>
          <label className="shortcut-sheet__search">
            <Search size={14} />
            <input
              ref={searchRef}
              value={query}
              placeholder={t("shortcuts.search")}
              aria-label={t("shortcuts.search")}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <Button
            variant="ghost"
            aria-label={t("actions.close")}
            onClick={close}
          >
            <X className="tiptap-button-icon" />
          </Button>
        </header>

        <div className="shortcut-sheet__body">
          {sections.length === 0 && (
            <p className="shortcut-sheet__empty">{t("shortcuts.none")}</p>
          )}
          {sections.map((section) => (
            <section key={section.id} className="shortcut-sheet__section">
              <h3>{section.title[lang]}</h3>
              <ul>
                {section.items.map((item, i) => (
                  <li key={i}>
                    <span>{item.label[lang]}</span>
                    <Keys shortcut={item} mac={mac} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** "Keyboard shortcuts" row for a menu. */
export function ShortcutsButton({ onOpen }: { onOpen?: () => void }) {
  const { t } = useTranslation();
  const mac = useMemo(() => isMac(), []);
  return (
    <Button
      variant="ghost"
      style={{ width: "100%" }}
      onClick={() => {
        onOpen?.();
        openShortcutSheet();
      }}
    >
      <Keyboard className="tiptap-button-icon" />
      <span className="tiptap-button-text">{t("shortcuts.title")}</span>
      <span className="shortcut-sheet__menu-hint">{mac ? "⌘/" : "Ctrl+/"}</span>
    </Button>
  );
}
