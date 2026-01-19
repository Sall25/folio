import { MoreHorizontal } from 'lucide-react';
import { Editor } from '@tiptap/react';
import ToolbarButton from './ToolbarButton';
import { FaAlignCenter, FaAlignLeft, FaAlignRight } from 'react-icons/fa';
import { useState, type PropsWithChildren } from 'react';
import Divider from './Divider';
import ColorDropdown from './ColorDropdown';
import ListItem from './ListItem';

function Row({ children }: { children: PropsWithChildren['children'] }) {
  return (
    <div className='flex gap-2.5'>
      {children}
    </div>
  );
}

function AlignMenu({ editor }: { editor: Editor }) {

  return (
    <div className='border border-neutral-300 dark:border-neutral-700
      rounded-lg z-40 flex my-auto pb-0.5 justify-center h-7 w-20'>
      {/* Align left */}
      <ToolbarButton
        editor={editor}
        toggleMark={(editor) => editor.chain().focus().setTextAlign('left').run()}
        active={editor.isActive({ textAlign: 'left' })}
      >
        <FaAlignLeft />
      </ToolbarButton>

      {/* Align center */}
      <ToolbarButton
        editor={editor}
        toggleMark={(editor) => editor.chain().focus().setTextAlign('center').run()}
        active={editor.isActive({ textAlign: 'center' })}
      >
        <FaAlignCenter />
      </ToolbarButton>

      {/* Align right */}
      <ToolbarButton
        editor={editor}
        toggleMark={(editor) => editor.chain().focus().setTextAlign('right').run()}
        active={editor.isActive({ textAlign: 'right' })}
      >
        <FaAlignRight />
      </ToolbarButton>

    </div>
  )
}

type E = React.MouseEvent<HTMLElement, MouseEvent>;

interface ContentProps {
  children: PropsWithChildren['children'];
  onMouseDown?: (e: E) => void;
  onMouseLeave?: () => void;
}

function Content({ children, onMouseDown, onMouseLeave }: ContentProps) {

  return (
    <div className="
            absolute flex  -bottom-12 right-0 mt-2 z-50 
            bg-white dark:bg-neutral-800 rounded-full p-1
            shadow shadow-neutral-200 
          dark:shadow-neutral-900 
          px-4 py-0.5 
          "
      onMouseDown={(e) => {
        if (onMouseDown) {
          onMouseDown(e);
        }
      }}
      onMouseLeave={onMouseLeave}>
      {children}
    </div>
  );
}

export default function MoreOptions({ editor }: { editor: Editor }) {

  const [open, setOpen] = useState(false);

  return (
    <div className='flex flex-col justify-center hover:bg-neutral-100 hover:dark:bg-neutral-800
     m-1 p-1 rounded z-50'>
      <MoreHorizontal
        className='w-4 h-4 text-gray-600'
        onMouseDown={() => setOpen(!open)}
      />

      {open && (
        <Content
          onMouseDown={(e) => e.preventDefault()}
          onMouseLeave={() => setOpen(false)}
        >
          <Row>
            <AlignMenu editor={editor} />
            <Divider />
            <ListItem editor={editor} />
            <Divider />
            <ColorDropdown editor={editor} />
          </Row>
        </Content>
      )}
    </div>
  );
}