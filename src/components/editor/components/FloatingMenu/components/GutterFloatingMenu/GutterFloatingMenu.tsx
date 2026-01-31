import { autoUpdate, computePosition, flip, offset, shift, type VirtualElement } from '@floating-ui/dom';
import { Editor } from '@tiptap/core';
import { GripVertical, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';


export function GutterFloatingMenu({ editor }: { editor: Editor }) {
  const floatingRef = useRef<HTMLElement | null>(null);
  const mouseY = useRef(0);
  const [visible, setVisible] = useState(false);


  const virtualRef = useRef<VirtualElement>({
    getBoundingClientRect: () => {
      const x = editor.view.dom.getBoundingClientRect().left - 5;
      return {
        x,
        y: mouseY.current,
        left: x,
        right: x,
        top: mouseY.current,
        bottom: mouseY.current,
        width: 0,
        height: 0
      }
    }
  });

  const updatePosition = async () => {
    const { x, y } = await computePosition(virtualRef.current, floatingRef.current!, {
      placement: 'left',
      middleware: [
        offset(0),
        shift({ padding: 0, boundary: editor.view.dom }),
        flip(),
      ]
    })
    floatingRef.current!.style.transform = `translate(${x}px, ${y}px)`;
  }

  const closeTimer = useRef<number | null>(null);

  // Show menu immediately
  const openMenu = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setVisible(true);
  };

  // Schedule menu close
  const scheduleClose = (delay = 300) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setVisible(false);
      closeTimer.current = null;
    }, delay);
  };

  useEffect(() => {


    const editorDom = editor.view.dom;

    const onMouseMoveEditor = (e: MouseEvent) => {
      const { top, bottom, height } = editorDom.getBoundingClientRect()

      console.log(height)
      if (height > e.clientY) {
        mouseY.current = height - (height - e.clientY)
      } else {
        mouseY.current = e.clientY
      }
      updatePosition()
      console.log(mouseY.current, e.clientY)
    }
    const onMouseEnterEditor = () => openMenu();
    const onMouseLeaveEditor = () => scheduleClose();

    editorDom.addEventListener('mousemove', onMouseMoveEditor);
    editorDom.addEventListener('mouseenter', onMouseEnterEditor);
    editorDom.addEventListener('mouseleave', onMouseLeaveEditor);

    // Keep menu open when hovering it
    const onMouseEnterMenu = () => openMenu();
    const onMouseLeaveMenu = () => scheduleClose();

    const menu = floatingRef.current;
    if (menu) {
      menu.addEventListener('mouseenter', onMouseEnterMenu);
      menu.addEventListener('mouseleave', onMouseLeaveMenu);
    }


    return () => {
      editorDom.removeEventListener('mousemove', onMouseMoveEditor);
      editorDom.removeEventListener('mouseenter', onMouseEnterEditor);
      window.removeEventListener('mouseleave', onMouseLeaveEditor);
      if (menu) {
        menu.removeEventListener('mouseenter', onMouseEnterMenu);
        menu.removeEventListener('mouseleave', onMouseLeaveMenu);
      }
    }
  }, [editor]);

  useEffect(() => {
    const cleanup = autoUpdate(virtualRef.current, floatingRef.current!, updatePosition);

    return () => cleanup()
  }, []);

  // if (!editor.isFocused()) {
  //   return null;
  // }

  // if (!visible) return null

  return (
    <div
      ref={(node) => {
        floatingRef.current = node
      }}
      className={`gutter-floating-menu ${visible ? 'isVisible' : ''}`}

    >
      <button className='btn btn-plus'>
        <Plus />
      </button>
      <button className='btn btn-grip'>
        <GripVertical />
      </button>

    </div>
  );

}