import { NodeViewWrapper, NodeViewContent, type ReactNodeViewProps } from "@tiptap/react";
import { useEffect, useState } from "react";

function deleteNode({ editor, getPos, node }: ReactNodeViewProps) {
  if (typeof getPos !== 'function') return;

  const pos = getPos();
  editor.chain()
    .focus()
    .deleteRange({ from: pos!, to: pos! + node.nodeSize })
    .run();
}


export function SidebarBlockView({ node, updateAttributes, selected, editor, getPos }: ReactNodeViewProps) {
  const { title } = node.attrs;


  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    if (!editor || typeof getPos !== 'function') return

    const update = () => {
      const { from, to } = editor.state.selection
      const pos = getPos()!
      const size = node.nodeSize

      const inside = from >= pos && to <= pos + size
      setIsActive(inside)
    }

    update()
    editor.on('selectionUpdate', update)

    return () => {
      editor.off('selectionUpdate', update)
    }
  }, [editor, getPos, node])

  const isSelected = selected || isActive

  return (
    <NodeViewWrapper
      className={`sidebar-block ${isSelected ? 'is-selected' : ''}`}
      style={{
        border: isSelected ? '2px solid #4f9cff' : '1px solid #333',
        borderRadius: 8,
        padding: 12,
        background: isSelected ? '#162033' : '#111',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
        }}>
        <button onClick={() => deleteNode({ editor, getPos, node } as ReactNodeViewProps)}>
          Delete
        </button>
        <span>📚</span>
        <input
          type="text"
          value={title}
          onChange={(e) => updateAttributes({ title: e.target.value })}
          placeholder="Sidebar title"
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'white',
            fontWeight: 'bold',
            fontSize: 16,
            flex: 1,
          }}
        />

        {/*Items */}
        <div
          style={{
            paddingLeft: 16,
            borderLeft: '2px solid #333',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
          <NodeViewContent />

        </div>

      </div>
    </NodeViewWrapper>
  )
}