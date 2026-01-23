import { Editor } from "@tiptap/react";
import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Root, Trigger, Content } from "@radix-ui/react-popover";
import { COLORS } from "./colors";

type ColorType = {
  hex: string;
  rgba: string;
  text: string;
  ring: string;
};




export default function ColorDropdown({ editor }: { editor: Editor }) {

  const [currentColor, setCurrentColor] = useState<string>(''); // text color
  const [currentBg, setCurrentBg] = useState<string>(''); // background color


  const [recentColors, setRecentColors] = useState<ColorType[]>([]);

  function addRecentColor(color: ColorType) {
    setRecentColors(prev => {
      // Remove duplicates
      const filtered = prev.filter(c => c.hex !== color.hex);
      // Add to front
      const updated = [color, ...filtered];
      // Keep only last 3
      return updated.slice(0, 3);
    });
  }

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const color = editor.getAttributes('textStyle').color ?? '#000000';
      setCurrentColor(color);

      const background = editor.getAttributes('textStyle').backgroundColor ?? '#000000';
      setCurrentBg(background);

    };

    editor.on('update', update);

    update();

    return () => {
      editor.off('update', update);
    }
  }, [editor]);

  return (

    <Root>
      <Trigger className="flex items-center gap-1 justify-center hover:text-neutral-500 hover:bg-neutral-100 rounded-lg dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-200 dark:border-neutral-600">
        <span className={`rounded-full h-4.5 w-4.5 text-sm flex justify-center items-center p-0.5 border dark:border-neutral-700`}>
          A
        </span>
        <ChevronDown className="w-3.5 h-3.5" />
      </Trigger>

      <Content side="bottom" align="start" sideOffset={12}>
        <div className="flex flex-col gap-4 z-50 py-4 px-4 min-w-45 rounded-2xl bg-white shadow-md shadow-neutral-100 text-neutral-600 dark:bg-neutral-800/60 ring-1 dark:ring-neutral-800 dark:text-neutral-200 dark:shadow-neutral-950 ring-neutral-200">

          {/* --- Recent Colors --- */}
          {recentColors.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Recent</span>
              <div className="flex gap-2">
                {recentColors.map(c => (
                  <span
                    key={c.hex}
                    className={`w-5 h-5 rounded-full  transition-transform duration-200 hover:scale-105 cursor-pointer
                           ${c.rgba === currentColor ? 'ring-2 ring-offset-1 ring-offset-white dark:ring-offset-neutral-900' : ''}
                           ${c.ring}`}
                    style={{ backgroundColor: c.rgba }}
                    onMouseDown={() => {
                      editor.chain().focus().toggleTextStyle({ color: c.rgba }).run();
                      addRecentColor(c);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* --- Main Text Colors --- */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Color</span>
            <div className="grid grid-cols-5 gap-3">
              {COLORS.map(c => (
                <span
                  key={c.hex}
                  className={`w-5 h-4.5 rounded-full flex justify-center items-center transition-transform duration-200 hover:scale-105 cursor-pointer text-xs
                         ${c.text} ring-1 ${c.ring} ${c.rgba === currentColor ? 'ring-2 ring-offset-1 ring-offset-white dark:ring-offset-neutral-900' : ''}`}
                  onMouseDown={() => {
                    editor.chain().focus().toggleTextStyle({ color: c.rgba }).run();
                    addRecentColor(c);
                  }}
                >
                  A
                </span>
              ))}
            </div>
          </div>

          {/* --- Background Colors --- */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Background</span>
            <div className="grid grid-cols-5 gap-2">
              {COLORS.map(c => (
                <span
                  key={c.hex + '-bg'}
                  className={`w-5 h-5 rounded-full transition-transform duration-200 hover:scale-105 cursor-pointer
                         ${c.rgba === currentBg ? 'ring-2 ring-offset-1 ring-offset-white dark:ring-offset-neutral-900' : ''} `}
                  style={{ backgroundColor: c.rgba }}
                  onMouseDown={() => {
                    editor.chain().focus().toggleTextStyle({ backgroundColor: c.rgba }).run();
                    setCurrentBg(c.rgba);
                  }}
                />
              ))}
            </div>
          </div>

        </div>
      </Content>
    </Root>

  );
}