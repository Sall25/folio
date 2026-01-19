import { Editor } from "@tiptap/react"
import ToolbarButton from './ToolbarButton'
import { FaListUl, FaListOl } from "react-icons/fa"
import { useEffect, useState } from "react";

export default function ListItem({ editor }: { editor: Editor }) {
  const [bulletActive, setBulletActive] = useState(false);
  const [orderedActive, setOrderedActive] = useState(false);

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const bullet = editor.isActive('bulletList');
      setBulletActive(bullet);

      const ordered = editor.isActive('orderedList');
      setOrderedActive(ordered);
    }

    editor.on('update', update);

    update();

    return () => {
      editor.off('update', update);
    }

  }, [editor]);

  return (
    <div className='border border-neutral-300 dark:border-neutral-700
          rounded-lg z-40 flex my-auto pb-0.5 justify-center h-7 w-14'
    >
      {/* Bullet List */}
      <ToolbarButton
        editor={editor}
        active={bulletActive}
        toggleMark={(editor) =>
          editor.chain().focus().toggleBulletList().run()
        }
      >
        <FaListUl className="w-4 h-4" />
      </ToolbarButton>

      {/* Ordered List */}
      <ToolbarButton
        editor={editor}
        active={orderedActive}
        toggleMark={(editor) =>
          editor.chain().focus().toggleOrderedList().run()
        }
      >
        <FaListOl className="w-4 h-4" />
      </ToolbarButton>

    </div>
  );
}