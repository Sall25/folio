import { useEffect, useState } from "react";
import { useStyleContext } from "../context/styleContext";
import { Content, Root, Trigger } from "@radix-ui/react-popover";
import { ChevronRight } from "lucide-react";
import { fonts } from "../constants/fonts";
import BubbleButton from "../../BubbleButton/BubbleButton";

export function FontFamilySelect() {
  const { editor } = useStyleContext();
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
      <Trigger className="outline-0">
        <div className="dropdown-item-select">
          <div className="dropdown-item">
            <span className="font-semibold text-[13px]">A</span>
            <span>Font</span>
          </div>
          <ChevronRight
            className="icon" />
        </div>
      </Trigger>

      <Content
        side="right"
        align="start"
        sideOffset={12}
        alignOffset={-4}
        className="p-0 m-0 outline-0"
      >
        <div className="dropdown">
          {fonts.map(f => (
            <BubbleButton
              key={f.label}
              active={font === f.value}
              onClick={() => {
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
            </BubbleButton>
          ))}
        </div>
      </Content>
    </Root>
  );
}
