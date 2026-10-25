import { useMemo, useState, type ReactNode } from "react";
import {
  EditorContent,
  EditorContext,
  useEditor,
  type Editor,
  type JSONContent,
} from "@tiptap/react";
import { ImageIcon, Smile } from "src/components/icons";
import { BubbleMenu } from "src/components/tiptap-ui/bubble-menu/bubble-menu";
import { DragHandle } from "src/components/tiptap-ui/drag-handle/drag-handle";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { IconPickerPopover } from "src/features/pages/cover";
import { CoverPickerCard } from "src/features/pages/cover/cover-picker-card";
import { DynamicIcon } from "src/features/pages/cover/dynamic-icon";
import type { Target } from "src/features/pages/cover/types";
import { makeLandingExtensions } from "./landing-extensions";
// The page editor's global node styles (the shell imports them in the app).
import "src/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "src/components/tiptap-node/code-block-node/code-block-node.scss";
import "src/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss";
import "src/components/tiptap-node/list-node/list-node.scss";
import "src/components/tiptap-node/image-node/image-node.scss";
import "src/components/tiptap-node/heading-node/heading-node.scss";
import "src/components/tiptap-node/paragraph-node/paragraph-node.scss";
import "src/features/shell/simple-editor.scss";
import "./landing-editor.scss";
import { BlockMarquee } from "src/components/tiptap-ui/block-marquee";

export interface PageCover {
  kind: "gradient" | "image";
  value: string;
  positionY?: number;
}
export interface PageIcon {
  name: string;
  color?: string;
  target?: Target;
}
export interface PageHeadLabels {
  addIcon: string;
  addCover: string;
  changeCover: string;
  removeCover: string;
}

const EDITOR_ATTRIBUTES = {
  autocomplete: "off",
  autocorrect: "off",
  autocapitalize: "off",
  spellcheck: "false",
  class: "simple-editor",
};

/**
 * The real Folio page editor for signed-out visitors: the page editor's
 * nodes, the slash menu, the selection toolbar, the drag handle, and a cover
 * and icon above the title. Nothing is saved; remount it (change its `key`)
 * to start over.
 */
export function LandingEditor({
  content,
  labels,
  cover,
  icon,
  className,
}: {
  content: JSONContent;
  labels: PageHeadLabels;
  cover?: PageCover | null;
  icon?: PageIcon | null;
  className?: string;
}) {
  const extensions = useMemo(() => makeLandingExtensions(), []);
  const editor = useEditor({
    extensions,
    content,
    // Created after mount: React node views would otherwise flushSync
    // during render.
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: { attributes: EDITOR_ATTRIBUTES },
  });

  return (
    <LandingPageSurface
      editor={editor}
      className={className}
      head={<PageHead labels={labels} cover={cover} icon={icon} />}
    />
  );
}

/** An editor laid out as a Folio page, with its menus. */
export function LandingPageSurface({
  editor,
  head,
  className,
}: {
  editor: Editor | null;
  head?: ReactNode;
  className?: string;
}) {
  const context = useMemo(() => ({ editor }), [editor]);
  return (
    <EditorContext.Provider value={context}>
      <div
        className={`landing-page-surface${className ? ` ${className}` : ""}`}
      >
        {head}
        <EditorContent
          editor={editor}
          role="presentation"
          className="simple-editor-content"
        />
        <BubbleMenu editor={editor} comments={false} />
        <DragHandle editor={editor} />
        <BlockMarquee editor={editor} />
      </div>
    </EditorContext.Provider>
  );
}

// ── Cover + icon, kept in state (nothing saved) ───────────────────────────
function PageHead({
  labels,
  cover: initialCover = null,
  icon: initialIcon = null,
}: {
  labels: PageHeadLabels;
  cover?: PageCover | null;
  icon?: PageIcon | null;
}) {
  const [cover, setCover] = useState<PageCover | null>(initialCover);
  const [icon, setIcon] = useState<PageIcon | null>(initialIcon);

  const pickIcon = (name: string, color?: string, target?: Target) =>
    setIcon({ name, color, target });

  const coverPicker = (
    <PopoverContent align="end" className="landing-page-head__popover">
      <CoverPickerCard
        coverImage={cover?.kind === "image" ? cover.value : null}
        positionY={cover?.positionY}
        onCoverImageChange={(url) =>
          setCover({ kind: "image", value: url, positionY: 50 })
        }
        onGradientChange={(gradient) =>
          setCover({ kind: "gradient", value: gradient })
        }
        onPositionChange={(y) =>
          setCover((c) => (c ? { ...c, positionY: y } : c))
        }
      />
    </PopoverContent>
  );

  return (
    <div className={`landing-page-head${cover ? " has-cover" : ""}`}>
      {cover && (
        <div
          className="landing-page-head__cover"
          style={
            cover.kind === "gradient"
              ? { background: cover.value }
              : {
                  backgroundImage: `url("${cover.value}")`,
                  backgroundPosition: `center ${cover.positionY ?? 50}%`,
                }
          }
        >
          <div className="landing-page-head__cover-actions">
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" size="small">
                  <span className="tiptap-button-text">
                    {labels.changeCover}
                  </span>
                </Button>
              </PopoverTrigger>
              {coverPicker}
            </Popover>
            <Button type="button" size="small" onClick={() => setCover(null)}>
              <span className="tiptap-button-text">{labels.removeCover}</span>
            </Button>
          </div>
        </div>
      )}

      <div className="landing-page-head__inner">
        {icon && (
          <IconPickerPopover onSelect={pickIcon} onRemove={() => setIcon(null)}>
            <Button
              type="button"
              variant="ghost"
              className="landing-page-head__icon"
              aria-label={labels.addIcon}
            >
              <PageIconGlyph icon={icon} />
            </Button>
          </IconPickerPopover>
        )}

        <div className="landing-page-head__add">
          {!icon && (
            <IconPickerPopover onSelect={pickIcon}>
              <Button type="button" variant="ghost" size="small">
                <Smile className="tiptap-button-icon" />
                <span className="tiptap-button-text">{labels.addIcon}</span>
              </Button>
            </IconPickerPopover>
          )}
          {!cover && (
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="small">
                  <ImageIcon className="tiptap-button-icon" />
                  <span className="tiptap-button-text">{labels.addCover}</span>
                </Button>
              </PopoverTrigger>
              {coverPicker}
            </Popover>
          )}
        </div>
      </div>
    </div>
  );
}

function PageIconGlyph({ icon }: { icon: PageIcon }) {
  if (icon.target === "Icons") {
    return (
      <DynamicIcon name={icon.name} size={52} style={{ color: icon.color }} />
    );
  }
  if (icon.target === "Upload") {
    return (
      <img src={icon.name} alt="" className="landing-page-head__icon-img" />
    );
  }
  return <span className="landing-page-head__emoji">{icon.name}</span>;
}
