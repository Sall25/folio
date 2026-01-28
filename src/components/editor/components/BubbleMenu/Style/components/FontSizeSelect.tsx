import { Root, Trigger, Content } from "@radix-ui/react-popover";
import { ChevronRight } from "lucide-react";
import { TbTextSize } from "react-icons/tb";
import { useStyleContext } from "../context/styleContext";
import { useEffect, useState } from "react";
import { sizes } from "../constants/sizes";
import BubbleButton from "../../BubbleButton/BubbleButton";


export function FontSizeSelect() {

  const { editor } = useStyleContext();

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
    <Root>
      <Trigger className="outline-0" asChild>
        <div className="dropdown-item flex justify-between">
          <div className="flex gap-1 items-center">
            <TbTextSize className="icon" />
            <span>Size</span>
          </div>
          <ChevronRight className="icon" />
        </div>
      </Trigger>
      <Content
        side="right"
        align="start"
        sideOffset={12}
        alignOffset={-4}
        className=" outline-0"
      >
        <div className="dropdown w-4 overflow-auto">
          {
            sizes.map(s => (
              <BubbleButton
                key={s}
                onClick={() => editor.chain().focus().toggleTextStyle({ fontSize: s }).run()}
                active={size === s}
              >
                <span className="w-full">{s.replace('px', '')}</span>
              </BubbleButton>
            ))}
        </div>
      </Content>
    </Root>
  );
}