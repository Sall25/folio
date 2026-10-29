import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { DOMSerializer } from "@tiptap/pm/model";
import { useCurrentEditor, useEditorState } from "@tiptap/react";
import { MIRROR_TYPES, pinTargets, scrollToBlock } from "./pin-targets";
import { PinFrame } from "./pin-parts";

// Blocks with editable text inside (to-do list, callout, image caption…)
// can't be moved out of the page: ProseMirror owns their content there. So
// the rail shows a MIRROR of them — a read-only copy redrawn from the editor
// state as it changes — while the block stays in place. Small actions write
// back to the page by position (ticking a to-do ticks it in the page);
// clicking the name scrolls to the block for real editing.
//
// Mounted once next to the rail (page-editor-layout.tsx).

type Pinned = { pos: number; node: PMNode };

const ICONS: Record<string, string> = {
  paragraph: "notes",
  heading: "title",
  blockquote: "format_quote",
  bulletList: "format_list_bulleted",
  orderedList: "format_list_numbered",
  taskList: "checklist",
  codeBlock: "code",
  horizontalRule: "horizontal_rule",
  callout: "campaign",
  appendix: "arrow_right",
  image: "image",
  video: "movie",
  audio: "graphic_eq",
  file: "attach_file",
  bookmark: "bookmark",
  mathBlock: "function",
  pageLink: "description",
  tableWrapper: "table",
};

/** The mirrored blocks pinned to the side, in page order. */
function pinnedMirrors(editor: Editor): Pinned[] {
  const found: Pinned[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (MIRROR_TYPES.includes(node.type.name) && node.attrs.pinSide) {
      found.push({ pos, node });
      return false; // a pinned list's own items aren't separate pins
    }
    return true;
  });
  return found;
}

// Unchanged nodes keep their identity between transactions (ProseMirror
// shares structure), so this skips re-renders while typing elsewhere.
const samePins = (a: Pinned[] | null, b: Pinned[] | null) =>
  a === b ||
  (!!a &&
    !!b &&
    a.length === b.length &&
    a.every((p, i) => p.pos === b[i].pos && p.node === b[i].node));

export function PinMirrors() {
  const { editor } = useCurrentEditor();
  const side = useSyncExternalStore(pinTargets.subscribe, () =>
    pinTargets.get("side"),
  );
  const pins = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? pinnedMirrors(e) : null),
    equalityFn: samePins,
  });

  if (!editor || !side || !pins?.length) return null;
  return createPortal(
    <>
      {pins.map((pin) => (
        <MirrorCard key={pin.pos} editor={editor} pin={pin} />
      ))}
    </>,
    side,
  );
}

function MirrorCard({ editor, pin }: { editor: Editor; pin: Pinned }) {
  const { t } = useTranslation();
  const { node, pos } = pin;
  const type = node.type.name;
  const unpin = editor.isEditable
    ? () =>
        editor
          .chain()
          .command(({ tr }) => {
            tr.setNodeAttribute(pos, "pinSide", false);
            return true;
          })
          .run()
    : undefined;

  return (
    <PinFrame
      icon={ICONS[type] ?? "keep"}
      label={t(`pins.labels.${type}`)}
      order={pos}
      onGoTo={() => scrollToBlock(editor, pos)}
      onUnpin={unpin}
    >
      <MirrorBody editor={editor} node={node} pos={pos} />
    </PinFrame>
  );
}

// What each block can DO in the rail. Anything not listed is drawn
// read-only with the editor's own HTML (ContentMirror).
type BodyProps = { editor: Editor; node: PMNode; pos: number };
const BODIES: Record<string, (p: BodyProps) => React.ReactNode> = {
  taskList: (p) => <TaskListMirror {...p} />,
  appendix: (p) => <ToggleMirror {...p} />,
  codeBlock: ({ node }) => <CodeMirror node={node} />,
  image: ({ node }) => <ImageMirror node={node} />,
  video: ({ node }) => <MediaMirror node={node} kind="video" />,
  audio: ({ node }) => <MediaMirror node={node} kind="audio" />,
  file: ({ node }) => <FileMirror node={node} />,
  bookmark: ({ node }) => <BookmarkMirror node={node} />,
};

function MirrorBody(props: BodyProps) {
  const body = BODIES[props.node.type.name];
  return body ? <>{body(props)}</> : <ContentMirror {...props} />;
}

/** Each item with a working checkbox; nested lists are indented. */
function TaskListMirror({
  editor,
  node,
  pos,
  depth = 0,
}: {
  editor: Editor;
  node: PMNode;
  pos: number;
  depth?: number;
}) {
  const rows: React.ReactNode[] = [];
  node.forEach((item, offset) => {
    const itemPos = pos + 1 + offset;
    const checked = !!item.attrs.checked;
    const text = item.firstChild?.textContent ?? "";
    rows.push(
      <label
        key={itemPos}
        className="pin-mirror__task"
        style={{ paddingLeft: depth * 16 }}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={!editor.isEditable}
          onChange={() =>
            editor
              .chain()
              .command(({ tr }) => {
                tr.setNodeAttribute(itemPos, "checked", !checked);
                return true;
              })
              .run()
          }
        />
        <span data-checked={checked || undefined}>{text || " "}</span>
      </label>,
    );
    // A nested list inside the item.
    item.forEach((child, childOffset) => {
      if (child.type.name === "taskList") {
        rows.push(
          <TaskListMirror
            key={`${itemPos}-n`}
            editor={editor}
            node={child}
            pos={itemPos + 1 + childOffset}
            depth={depth + 1}
          />,
        );
      }
    });
  });
  return <div className="pin-mirror__tasks">{rows}</div>;
}

/** Any block, drawn read-only with the editor's own HTML. */
function ContentMirror({ editor, node }: BodyProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const serializer = DOMSerializer.fromSchema(editor.schema);
    // The block itself (a heading stays a heading); a callout's frame is
    // drawn by the card, so only its content.
    el.replaceChildren(
      node.type.name === "callout"
        ? serializer.serializeFragment(node.content)
        : serializer.serializeNode(node),
    );
  }, [editor, node]);
  const bg = node.attrs.backgroundColor as string | null | undefined;
  return (
    <div
      ref={ref}
      className="pin-mirror__content tiptap ProseMirror"
      style={bg && bg !== "transparent" ? { background: bg } : undefined}
    />
  );
}

function ImageMirror({ node }: { node: PMNode }) {
  const src = node.attrs.src as string | null;
  if (!src) return null;
  return (
    <a href={src} target="_blank" rel="noreferrer" title={src}>
      <img
        className="pin-mirror__image"
        src={src}
        alt={(node.attrs.alt as string | null) ?? ""}
      />
    </a>
  );
}

/** The summary, and the content when open; the arrow opens / closes it in
 *  the page too. */
function ToggleMirror({ editor, node, pos }: BodyProps) {
  const open = node.attrs.open !== false;
  const summary = node.firstChild?.textContent ?? "";
  const content = node.child(1);
  return (
    <div className="pin-mirror__toggle">
      <button
        type="button"
        className="pin-mirror__toggle-head"
        aria-expanded={open}
        disabled={!editor.isEditable}
        onClick={() =>
          editor
            .chain()
            .command(({ tr }) => {
              tr.setNodeAttribute(pos, "open", !open);
              return true;
            })
            .run()
        }
      >
        <span className="pin-mirror__chevron" data-open={open || undefined}>
          ▸
        </span>
        <span>{summary || "\u00a0"}</span>
      </button>
      {open && content && (
        <ContentMirror editor={editor} node={content} pos={pos} />
      )}
    </div>
  );
}

function CodeMirror({ node }: { node: PMNode }) {
  const { t } = useTranslation();
  return (
    <div className="pin-mirror__code">
      <pre>
        <code>{node.textContent}</code>
      </pre>
      <button
        type="button"
        onClick={() => void navigator.clipboard?.writeText(node.textContent)}
      >
        {t("pins.copy")}
      </button>
    </div>
  );
}

function MediaMirror({
  node,
  kind,
}: {
  node: PMNode;
  kind: "audio" | "video";
}) {
  const src = node.attrs.src as string | null;
  if (!src) return null;
  const name = (node.attrs.fileName as string | null) ?? "";
  return (
    <div className="pin-mirror__media">
      {kind === "audio" ? (
        <audio controls preload="metadata" src={src} />
      ) : (
        <video
          controls
          preload="metadata"
          src={src}
          poster={(node.attrs.poster as string | null) ?? undefined}
        />
      )}
      {name && <span className="pin-mirror__caption">{name}</span>}
    </div>
  );
}

type Attachment = { id: string; name: string; url: string; size: number };

function FileMirror({ node }: { node: PMNode }) {
  const files = (node.attrs.files as Attachment[] | null) ?? [];
  return (
    <div className="pin-mirror__files">
      {files.map((f) => (
        <a
          key={f.id}
          href={f.url}
          download={f.name}
          target="_blank"
          rel="noreferrer"
        >
          <span className="pin-mirror__file-name">{f.name}</span>
          <span className="pin-mirror__caption">
            {(f.size / 1024 / 1024).toFixed(1)} MB
          </span>
        </a>
      ))}
    </div>
  );
}

function BookmarkMirror({ node }: { node: PMNode }) {
  const url = node.attrs.url as string | null;
  if (!url) return null;
  const title = (node.attrs.title as string | null) || url;
  return (
    <a
      className="pin-mirror__bookmark"
      href={url}
      target="_blank"
      rel="noreferrer"
    >
      <span className="pin-mirror__file-name">{title}</span>
      <span className="pin-mirror__caption">
        {new URL(url, location.href).host}
      </span>
    </a>
  );
}
