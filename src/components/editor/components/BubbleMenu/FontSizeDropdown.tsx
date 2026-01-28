import * as Select from '@radix-ui/react-select';
import { TbTextSize } from 'react-icons/tb';
import { ChevronRight, Check } from 'lucide-react';
import type { Editor } from '@tiptap/react';

interface FontSizeDropdownProps {
  editor: Editor;
  size: string;
  sizes: string[];
}

export function FontSizeDropdown({ editor, size, sizes }: FontSizeDropdownProps) {
  return (
    <Select.Root value={size} onValueChange={(val) => editor.chain().focus().toggleTextStyle({ fontSize: val }).run()}>
      <Select.Trigger className="dropdown-item flex justify-between">
        <div className="flex gap-2 items-center">
          <TbTextSize className="w-3.5 h-3.5" />
          <span>Size</span>
        </div>
        <ChevronRight className="w-4 h-4" />
      </Select.Trigger>

      <Select.Portal>
        <Select.Content side="right" align="start" sideOffset={6} className="dropdown dropdown-content"
        >
          <Select.ScrollUpButton />
          <Select.Viewport className="select-viewport">
            {sizes.map((s) => (
              <Select.Item key={s} value={s} className="dropdown-item select-item">
                <Select.ItemText>{s.replace('px', '')}</Select.ItemText>
                {size === s && <Select.ItemIndicator><Check className="w-4 h-4" /></Select.ItemIndicator>}
              </Select.Item>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton />
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
