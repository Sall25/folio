import { Editor } from "@tiptap/react";
import { StyleBase } from "./StyleBase";
import { Headings } from "./Headings";
import { Lists } from "./Lists";
import { useEffect, useState } from "react";
import { Content, Root, Trigger } from "@radix-ui/react-popover";
import { CodeBlock } from "./CodeBlock";
import { ChevronDown } from "lucide-react";
import { Text } from "./Text";
import { Blockquote } from "./Blockquote";


export function StyleDropdown({ editor }: { editor: Editor }) {

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
    <StyleBase editor={editor}>
      <Root>
        <Trigger className="" asChild>
          <button
            onMouseDown={(e) => e.preventDefault()}
            className="bubble-trigger">
            <span className="flex">{active}</span>
            <ChevronDown className="icon" size={20} />
          </button>
        </Trigger>
        <Content
          side="bottom"
          align="start"
          sideOffset={8}
          alignOffset={-25}
          className="dropdown-menu active"
        >
          <label className="dropdown-item pl-2.5 mt-2.5">Turn into</label>
          <Text />
          <Headings />
          <Lists />
          <CodeBlock />
          <Blockquote />
        </Content>
      </Root>
    </StyleBase>
  );
}