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
  taskList: "checklist",
  callout: "campaign",
  image: "image",
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
      {type === "taskList" ? (
        <TaskListMirror editor={editor} node={node} pos={pos} />
      ) : type === "image" ? (
        <ImageMirror node={node} />
      ) : (
        <ContentMirror editor={editor} node={node} />
      )}
    </PinFrame>
  );
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
function ContentMirror({ editor, node }: { editor: Editor; node: PMNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const serializer = DOMSerializer.fromSchema(editor.schema);
    el.replaceChildren(serializer.serializeFragment(node.content));
  }, [editor, node]);
  const bg = node.attrs.backgroundColor as string | null | undefined;
  return (
    <div
      ref={ref}
      className="pin-mirror__content tiptap"
      style={bg && bg !== "transparent" ? { background: bg } : undefined}
    />
  );
}

function ImageMirror({ node }: { node: PMNode }) {
  const src = node.attrs.src as string | null;
  if (!src) return null;
  return (
    <img
      className="pin-mirror__image"
      src={src}
      alt={(node.attrs.alt as string | null) ?? ""}
    />
  );
}
