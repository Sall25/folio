import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { JSONContent } from "@tiptap/core";
import { Card } from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { useToast } from "src/features/shell/toast";
import { useCreatePage } from "src/hooks/use-create-page";
import { useCurrentPerson } from "src/hooks/use-session";
import { useCurrentWorkspace } from "src/hooks/use-workspaces";
import { useEnterableTeamspaces } from "src/hooks/use-enterable-teamspaces";
import { useActivePageActions } from "src/features/pages/context/active-page-context";
import { makePage } from "src/utils/make-page";
import type { Page } from "src/types";
import { applyCaptureShortcut } from "./capture-shortcut";
import "./quick-capture.scss";

// Desktop app: quick capture. The shortcut from My settings (any app, Folio
// in the background or minimized) brings Folio to the front with this box
// (src-tauri/src/capture.rs). The first line is the title, the rest the
// page's text. Ctrl/Cmd+Enter saves it as a new page in Private or a
// teamspace and, if Folio wasn't in front, sends it back behind; Esc closes.
// Offline, the page is made on this computer and sent later, like any page
// made offline (use-create-page.ts). Mount once; renders the box when open.

const PRIVATE = "private";

/** "Title\nline\n\nline" → the page's document. */
function noteContent(title: string, lines: string[]): JSONContent {
  const paragraphs = lines.map((line) =>
    line
      ? { type: "paragraph", content: [{ type: "text", text: line }] }
      : { type: "paragraph" },
  );
  return {
    type: "doc",
    content: [
      {
        type: "title",
        content: title ? [{ type: "text", text: title }] : [],
      },
      ...(paragraphs.length ? paragraphs : [{ type: "paragraph" }]),
    ],
  };
}

export function QuickCapture() {
  const { t } = useTranslation();
  const { show } = useToast();
  const createPage = useCreatePage({ quiet: true });
  const { person } = useCurrentPerson();
  const { workspaceId } = useCurrentWorkspace();
  const teamspaces = useEnterableTeamspaces();
  const { setActivePageId } = useActivePageActions();

  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [place, setPlace] = useState(PRIVATE);
  const backgroundRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // The shortcut, given to the app at start; the box opens when it's
  // pressed.
  useEffect(() => {
    void applyCaptureShortcut();
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    void import("@tauri-apps/api/event").then(({ listen }) =>
      listen<{ wasInBackground: boolean }>("quick-capture", ({ payload }) => {
        backgroundRef.current = payload.wasInBackground;
        setOpen(true);
      }).then((stop) => {
        if (cancelled) stop();
        else unlisten = stop;
      }),
    );
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const close = () => {
    setOpen(false);
    setText("");
  };

  const goBackBehind = async () => {
    if (!backgroundRef.current) return;
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().minimize();
    } catch {
      /* stays in front */
    }
  };

  const save = () => {
    const [first = "", ...rest] = text.replace(/\r/g, "").split("\n");
    const title = first.trim();
    if (!title && !rest.some((l) => l.trim())) return;
    if (!person || !workspaceId) return;

    const ts = teamspaces.find((x) => x.page.id === place);
    const base = ts
      ? makePage({
          title,
          parentId: ts.page.id,
          category: "Teamspaces",
          ownerId: person.id,
          workspaceId: ts.page.workspaceId ?? workspaceId,
          teamspaceId: ts.page.id,
        })
      : makePage({
          title,
          parentId: null,
          category: "Private",
          ownerId: person.id,
          workspaceId,
        });
    // Trailing empty lines dropped.
    while (rest.length && !rest[rest.length - 1].trim()) rest.pop();
    const page: Page = { ...base, content: noteContent(title, rest) };
    createPage.mutate(page);

    const where = ts?.page.title || t("section.private", "Private");
    show(t("quickCapture.saved", { where }), "success", {
      label: t("quickCapture.open"),
      onClick: () => setActivePageId(page.id),
    });
    close();
    void goBackBehind();
  };

  if (!open) return null;

  return createPortal(
    <div
      className="quick-capture"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <Card
        className="quick-capture__card"
        role="dialog"
        aria-label={t("quickCapture.title")}
      >
        <div className="quick-capture__top">
          <label className="quick-capture__place">
            <span>{t("quickCapture.newNoteIn")}</span>
            <select value={place} onChange={(e) => setPlace(e.target.value)}>
              <option value={PRIVATE}>
                {t("section.private", "Private")}
              </option>
              {teamspaces.map((ts) => (
                <option key={ts.page.id} value={ts.page.id}>
                  {ts.page.title || t("page.untitled")}
                </option>
              ))}
            </select>
          </label>
          <span className="quick-capture__kbd">Esc</span>
        </div>
        <textarea
          ref={inputRef}
          className="quick-capture__text"
          placeholder={t("quickCapture.placeholder")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              close();
              void goBackBehind();
            } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              save();
            }
          }}
        />
        <div className="quick-capture__foot">
          <span className="quick-capture__hint">
            {t("quickCapture.hint")}
          </span>
          <Button type="button" variant="primary" onClick={save}>
            <span className="tiptap-button-text">
              {t("quickCapture.save")}
            </span>
          </Button>
        </div>
      </Card>
    </div>,
    document.body,
  );
}
