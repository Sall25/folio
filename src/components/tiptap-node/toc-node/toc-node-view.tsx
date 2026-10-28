import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  PinFrame,
  PinStub,
  scrollToBlock,
  usePinTarget,
} from "src/features/editor/pins";
import { useTocActions, useTocContent } from "./toc-context";

export function TocNodeView({
  node,
  editor,
  getPos,
  updateAttributes,
}: ReactNodeViewProps) {
  const { t } = useTranslation();
  const { topOffset, maxShowCount, showTitle } = node.attrs;
  const { navigateToHeading, normalizeDepths } = useTocActions();
  const { tocContent } = useTocContent();

  const items = tocContent.slice(0, maxShowCount);
  const depths = normalizeDepths(items);

  const toc = (
    <div className="toc-node">
      {showTitle && <p className="toc-node__title">Table of contents</p>}

      {items.length === 0 ? (
        <p className="toc-node__empty">
          Add headings to generate a table of contents.
        </p>
      ) : (
        <nav>
          {items.map((item, i) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="toc-node__item"
              style={{ paddingLeft: `${(depths[i] - 1) * 16 + 8}px` }}
              onClick={(e) => {
                e.preventDefault();
                navigateToHeading(item, topOffset);
              }}
            >
              {item.textContent}
            </a>
          ))}
        </nav>
      )}
    </div>
  );

  // Pinned to the side (pin-targets.ts): drawn in the rail, a stub here.
  const side = usePinTarget(editor, "side", !!node.attrs.pinSide);
  if (side) {
    const label = t("pins.labels.tocNode");
    const unpin = editor.isEditable
      ? () => updateAttributes({ pinSide: false })
      : undefined;
    return (
      <NodeViewWrapper data-type="toc-node" contentEditable={false}>
        <PinStub
          icon="toc"
          label={label}
          where={t("pins.whereSide")}
          onShowHere={unpin}
        />
        {createPortal(
          <PinFrame
            icon="toc"
            label={label}
            order={getPos() ?? 0}
            onGoTo={() => scrollToBlock(editor, getPos())}
            onUnpin={unpin}
          >
            {toc}
          </PinFrame>,
          side,
        )}
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper data-type="toc-node" contentEditable={false}>
      {toc}
    </NodeViewWrapper>
  );
}