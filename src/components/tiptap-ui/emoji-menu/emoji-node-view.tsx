import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";

export function EmojiNodeView({ node }: ReactNodeViewProps) {
  const src = node.attrs.src;
  const name = node.attrs.name;

  return (
    <NodeViewWrapper as="span" contentEditable={false}>
      <img
        src={src}
        alt={name}
        className="emoji"
        draggable={false}
        loading="lazy"
      />
    </NodeViewWrapper>
  );
}
