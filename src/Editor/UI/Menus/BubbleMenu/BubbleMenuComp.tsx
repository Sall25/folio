import { BubbleMenu } from '@tiptap/react/menus'
import React, { useEffect, useState } from 'react'
import { Editor } from '@tiptap/core'
import clsx from 'clsx'

import './BubbleMenuComp.scss'

interface BubbleMenuCompProps {
  editor: Editor
  children: React.ReactNode
}

export function BubbleMenuComp({ editor, children }: BubbleMenuCompProps) {
  const [menuVisible, setMenuVisible] = useState(false)

  const [mouseDown, setMouseDown] = useState(false)

  useEffect(() => {
    const down = () => setMouseDown(true)
    const up = () => setMouseDown(false)

    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)

    return () => {
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
    }
  }, [])

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={(({ editor }) => {

        const { selection } = editor.state

        if (selection.empty) return false
        if (mouseDown) return false



        return true
      })}
      options={{
        placement: 'top',
        flip: true, offset: 8,

        strategy: 'fixed',

        onShow: () => {
          setMenuVisible(true)

          // const raf = requestAnimationFrame(() => setOpaque(true))
          // cancelAnimationFrame(raf)

        },
        onHide: () => {
          setMenuVisible(false)
        },
        onUpdate: () => {
          // fires on reposition — useful for recalculating
          // custom transform origins, arrow directions, etc.
        },
      }}

    >
      {children}
      {/* <div
        className={clsx(
          'bubble-menu',
          menuVisible ? 'active' : ''
        )}
      >
        
      </div> */}

    </BubbleMenu>
  )
}