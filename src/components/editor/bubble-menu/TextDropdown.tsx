import { Editor } from "@tiptap/react";
import { Select } from "../dropdown";
import {
  List,
  ListOrdered,
  ChevronRight,
  Quote,
  Code
} from "lucide-react";
import { TbTextSize } from 'react-icons/tb';
import { useEffect, useState } from "react";
import type { Level } from "@tiptap/extension-heading";
import { Root, Content, Trigger } from '@radix-ui/react-popover';
import { useEditorState } from "@tiptap/react";
import Button from "./Button";

const sizes = [
  '14px', '15px', '16px',
  '17px', '18px', '19px',
  '20px', '21px', '22px',
  '23px', '24px', '25px',
  '26px', '27px', '28px'
];

const fonts = [
  { label: 'Default', value: null },
  { label: 'Inter', value: '"Inter", system-ui, sans-serif' },
  { label: 'Roboto', value: '"Roboto", system-ui, sans-serif' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Mono', value: "JetBrains Mono, monospace" },
];

function FontSizeSelect({ editor }: { editor: Editor }) {
  const { fontSize } = useEditorState({
    editor,
    selector: ({ editor }) => ({
      fontSize: editor.getAttributes('textStyle').fontSize ?? '16px',
    }),
  })

  if (!editor) return null

  return (
    <Select>
      <Select.Trigger>
        <div className="flex gap-1 items-center pl-1.5">
          <TbTextSize className="w-3.5 h-3.5" />
          <span>Size</span>
        </div>
        <ChevronRight className="w-4 h-4" />
      </Select.Trigger>

      <Select.Content className="popover-animate">
        {sizes.map(s => (
          <Button
            key={s}
            active={fontSize === s}
            onClick={() => editor.chain().focus().toggleTextStyle({ fontSize: s }).run()}
            className="w-full justify-start px-2 py-1 text-sm"
          >
            {s.replace('px', '')}
          </Button>
        ))}
      </Select.Content>
    </Select>
  )
}

function FontFamilySelect({ editor }: { editor: Editor }) {
  const { fontFamily } = useEditorState({
    editor,
    selector: ({ editor }) => ({
      fontFamily: editor.getAttributes('textStyle').fontFamily ?? null,
    }),
  })

  if (!editor) return null

  return (
    <Select>
      <Select.Trigger>
        <div className="flex items-center gap-1 pl-1.5">
          <span className="font-semibold text-[13px]">A</span>
          <span>Font</span>
        </div>
        <ChevronRight className="w-4 h-4" />
      </Select.Trigger>

      <Select.Content className="popover-animate">
        {fonts.map(f => (
          <Button
            key={f.label}
            active={fontFamily === f.value}
            onClick={() => {
              const chain = editor.chain().focus()
              if (f.value) {
                chain.setFontFamily(f.value).run()
              } else {
                chain.unsetFontFamily().run()
              }
            }}
            className="w-full justify-start px-2 py-1 text-sm"
            style={{ fontFamily: f.value ?? undefined }}
          >
            {f.label}
          </Button>
        ))}
      </Select.Content>
    </Select>
  )
}

function Headings({ editor }: { editor: Editor }) {
  const { activeHeading } = useEditorState({
    editor,
    selector: ({ editor }) => {
      const levels = [1, 2, 3] as const
      const current = levels.find(level => editor.isActive('heading', { level }))
      return { activeHeading: current ?? null }
    },
  })

  if (!editor) return null

  return (
    <>
      {[1, 2, 3].map(level => (
        <Button
          key={level}
          active={activeHeading === level}
          onClick={() => editor.chain().focus().toggleHeading({ level: level as Level }).run()}
          className="flex gap-1 items-center w-full justify-start px-2 py-1 text-sm"
        >
          <span className="font-semibold text-[13px]">H</span>
          <span className="text-xs">{level}</span>
          <span className="ml-2">Heading {level}</span>
        </Button>
      ))}
    </>
  )
}

function Lists({ editor }: { editor: Editor }) {
  const { bulletActive, orderedActive } = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bulletActive: editor.isActive('bulletList'),
      orderedActive: editor.isActive('orderedList'),
    }),
  })

  if (!editor) return null

  return (
    <>
      <Button
        active={bulletActive}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className="flex items-center gap-2 px-2 py-1 w-full justify-start text-sm"
      >
        <List className="w-4 h-4" />
        <span>Bullet List</span>
      </Button>

      <Button
        active={orderedActive}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className="flex items-center gap-2 px-2 py-1 w-full justify-start text-sm"
      >
        <ListOrdered className="w-4 h-4" />
        <span>Ordered List</span>
      </Button>
    </>
  )
}

function Blocks({ editor }: { editor: Editor }) {
  const {
    isCodeBlock,
    isBlockquote,
  } = useEditorState({
    editor,
    selector: ({ editor }) => ({
      isCodeBlock: editor.isActive('codeBlock'),
      isBlockquote: editor.isActive('blockquote'),
    }),
  })

  if (!editor) return null

  return (
    <div className="flex flex-col gap-1">
      {/* Headings */}
      <Headings editor={editor} />

      {/* Lists */}
      <Lists editor={editor} />

      {/* Divider */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 my-1" />

      {/* Blockquote */}
      <Button
        active={isBlockquote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className="flex items-center gap-2 px-2 py-1 w-full justify-start text-sm"
      >
        <Quote className="w-4 h-4" />
        <span>Blockquote</span>
      </Button>

      {/* Code Block */}
      <Button
        active={isCodeBlock}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className="flex items-center gap-2 px-2 py-1 w-full justify-start text-sm font-mono"
      >
        <Code className="w-4 h-4" />
        <span>Code Block</span>
      </Button>
    </div>
  );
}



export default function TextDropdown({ editor }: { editor: Editor }) {

  const [active, setActive] = useState<string>('Text');

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      if (!editor) return;

      const { $from } = editor.state.selection;

      // Walk up the document tree from cursor position
      for (let depth = $from.depth; depth > 0; depth--) {
        const node = $from.node(depth);

        //  Bullet List
        if (node.type.name === 'bulletList') {
          setActive('Bullet List');
          return;
        }

        //  Ordered List
        if (node.type.name === 'orderedList') {
          setActive('Ordered List');
          return;
        }

        // Headings (all levels)
        if (node.type.name === 'heading') {
          setActive(`Heading ${node.attrs.level}`);
          return;
        }
      }

      //  Default text (paragraph, etc.)
      setActive('Text');
    };


    editor.on('selectionUpdate', update);
    editor.on('update', update);

    update();

    return () => {
      editor.off('selectionUpdate', update);
      editor.off('update', update);
    };
  }, [editor]);


  return (
    <Root>
      <Trigger
        className="px-3"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <span
          className="px-1.5 py-0.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800
          text-neutral-600 dark:text-neutral-400
          "
        >
          {active}
        </span>
      </Trigger>

      <Content side="bottom" align="start" sideOffset={10}
        className="dark:bg-neutral-900 rounded-2xl popover-animate"
      >
        <div
          className="
          flex flex-col gap-3 z-50 py-3 px-1.5 min-w-40 
          rounded-2xl bg-white shadow-xl shadow-neutral-100 text-neutral-400
        dark:bg-neutral-800/40 ring-1 dark:ring-neutral-800
        dark:text-neutral-200 dark:shadow-neutral-950"
        >
          {/* Size */}
          <FontSizeSelect
            editor={editor} />

          {/*Font Family */}
          <FontFamilySelect
            editor={editor} />

          {/* Blocks (Code, Blockquote, Headings, Lists) */}
          <Blocks
            editor={editor} />

        </div>
      </Content>
    </Root>
  );
}