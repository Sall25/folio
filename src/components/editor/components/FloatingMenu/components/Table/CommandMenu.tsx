import { useEffect, useRef, useState } from 'react'
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react'
import { Editor } from '@tiptap/react'

function CommandMenu({ editor }: { editor: Editor }) {

  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, update } = useFloating({
    placement: 'bottom-start',
    middleware: [offset(4), flip(), shift({ padding: 4 })],
    whileElementsMounted: autoUpdate,
  })

  const virtualRef = useRef({
    getBoundingClientRect: () => new DOMRect(0, 0, 0, 0),
  })

  useEffect(() => {
    if (!editor) return

    // Attach virtual ref after render
    refs.setReference(virtualRef.current)

    const handleUpdate = () => {
      const pos = editor.state.selection.from
      const coords = editor.view.coordsAtPos(pos)

      virtualRef.current.getBoundingClientRect = () =>
      ({
        x: coords.left,
        y: coords.top,
        width: 0,
        height: coords.bottom - coords.top,
        top: coords.top,
        bottom: coords.bottom,
        left: coords.left,
        right: coords.left,
        toJSON: () => { },
      } as DOMRect)

      update()
    }

    editor.on('selectionUpdate', handleUpdate)
    editor.on('transaction', handleUpdate)

    return () => {
      editor.off('selectionUpdate', handleUpdate)
      editor.off('transaction', handleUpdate)
    }
  }, [editor, refs, update])


  return (
    <div style={{ padding: 100 }}>
      <button
        ref={(node) => refs.setReference(node)}
        onClick={() => setOpen((o) => !o)}
      >
        Toggle Popover
      </button>

      {open && (
        <div
          ref={(node) => refs.setFloating(node)}
          style={{
            ...floatingStyles,
            position: floatingStyles.position,
            background: '#333',
            color: 'white',
            borderRadius: 6,
            padding: 8,
          }}
        >
          <div>Menu item 1</div>
          <div>Menu item 2</div>
        </div>
      )}
    </div>

  )
}

export default CommandMenu
