import { Editor } from "@tiptap/react";
import { Dropdown, Select } from "../../dropdown";
import {
  List,
  ListOrdered,
  ChevronRight
} from "lucide-react";

import { useEffect, useState } from "react";
import type { Level } from "@tiptap/extension-heading";
import { Root, Content, Trigger } from '@radix-ui/react-popover';
import './TextDropdown.scss'
import { FontSizeDropdown } from "./FontSizeDropdown";
import { TbTextSize } from "react-icons/tb";

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
  const [size, setSize] = useState('16px');
  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const s = editor.getAttributes('textStyle').fontSize ?? '16px';
      setSize(s);
    };

    editor.on('update', update);

    update();

    return () => {
      editor.off('update', update);
    }
  }, [editor]);

  return (
    // <Select>
    //   <Select.Trigger>
    //     <div className="dropdown-item">
    //       <TbTextSize className="w-3.5 h-3.5" />
    //       <span>Size</span>
    //     </div>
    //     <ChevronRight className="w-4 h-4" />
    //   </Select.Trigger>
    //   <Select.Content>
    //     {
    //       sizes.map(s => (
    //         <Select.Option
    //           key={s}
    //           onSelect={() => editor.chain().focus().toggleTextStyle({ fontSize: s }).run()}
    //           active={size === s}
    //         >
    //           <span className="w-full">{s.replace('px', '')}</span>
    //         </Select.Option>
    //       ))}
    //   </Select.Content>
    // </Select>

    <Root>
      <Trigger>
        <div className="dropdown-item flex justify-between">
          <div className="flex gap-1 items-center">
            <TbTextSize className="w-3.5 h-3.5" />
            <span>Size</span>
          </div>
          <ChevronRight className="w-4 h-4" />
        </div>
      </Trigger>
      <Content
        side="right"
        align="start"
        sideOffset={12}
        alignOffset={-4}
      >
        <div className="dropdown dropdown-content overflow-auto">
          {
            sizes.map(s => (
              <Select.Option
                key={s}
                onSelect={() => editor.chain().focus().toggleTextStyle({ fontSize: s }).run()}
                active={size === s}
              >
                <span className="w-full">{s.replace('px', '')}</span>
              </Select.Option>
            ))}
        </div>
      </Content>
    </Root>
  );
}

function FontFamilySelect({ editor }: { editor: Editor }) {
  const [font, setFont] = useState<string | null>(null);

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const f = editor.getAttributes('textStyle').fontFamily ?? null;
      setFont(f);
    };

    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    update();

    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
    };
  }, [editor]);

  return (
    <Root>
      <Trigger>
        <div className="dropdown-item flex justify-between">
          <div className="flex gap-1 items-center">
            <span className="font-semibold text-[13px]">A</span>
            <span>Font</span>
          </div>
          <ChevronRight className="w-4 h-4" />
        </div>
      </Trigger>

      <Content
        side="right"
        align="start"
        sideOffset={12}
        alignOffset={-4}
      >
        <div className="dropdown dropdown-content overflow-auto">
          {fonts.map(f => (
            <Select.Option
              key={f.label}
              active={font === f.value}
              onSelect={() => {
                const chain = editor.chain().focus();

                if (f.value) {
                  chain.setFontFamily(f.value).run();
                } else {
                  chain.unsetFontFamily().run();
                }
              }}

            >
              <span
                className="w-full"
                style={{ fontFamily: f.value ?? undefined }}
              >
                {f.label}
              </span>
            </Select.Option>
          ))}
        </div>
      </Content>
    </Root>
  );
}


function Headings({ editor }: { editor: Editor }) {
  const [activeLevel, setActiveLevel] = useState<number | null>(null);

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const levels = [1, 2, 3] as const;
      const current = levels.find(level =>
        editor.isActive('heading', { level })
      );

      setActiveLevel(current ?? null);
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
    <>
      {[1, 2, 3].map(level => (
        <Dropdown.Item
          key={level}
          onSelect={() =>
            editor.chain().focus().toggleHeading({ level: level as Level }).run()
          }
          active={activeLevel === level}
        >
          <div className="dropdown-item">
            <span className="font-semibold text-[13px]">H</span>
            <span className="text-xs">{level}</span>
          </div>
          <span>Heading {level}</span>
        </Dropdown.Item>
      ))}
    </>
  );
}


function Lists({ editor }: { editor: Editor }) {
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
    <>
      {
        ['bulletList', 'orderedList'].map(list => (
          <Dropdown.Item
            key={list}
            active={list === 'bulletList' ? bulletActive : orderedActive}
            onSelect={() => {
              if (list === 'bulletList') {
                editor.chain().focus().toggleBulletList().run()
              } else {
                editor.chain().focus().toggleOrderedList().run()
              }
            }}
          >
            {list === 'bulletList' && (
              <>
                <List className="w-4 h-4" />
                <span>Bullet List</span>
              </>
            )}
            {list === 'orderedList' && (
              <>
                <ListOrdered className="w-4 h-4" />
                <span>Ordered list</span>
              </>
            )}
          </Dropdown.Item>
        ))
      }
    </>
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
      >
        <span className="trigger-button">
          {active}
        </span>
      </Trigger>

      <Content side="bottom" align="start" sideOffset={10}

      >
        <div className="dropdown">
          <FontFamilySelect editor={editor} />
          <FontSizeSelect editor={editor} />
          <Headings editor={editor} />
        </div>
      </Content>
    </Root>
  );
}