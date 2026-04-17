import { Editor } from "@tiptap/core";
import { FloatingMenu } from "@tiptap/react/menus";
import { Smile } from "lucide-react";
import { IconPicker } from "src/components/tiptap-node/icon-node";
import { useState } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";

interface IconFloatingMenuProps {
  editor: Editor;
}

export function IconFloatingMenu({ editor }: IconFloatingMenuProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <FloatingMenu
      editor={editor}
      options={{
        placement: "top-start",
        offset: 16,
      }}
      shouldShow={({ state }) => {
        const { $from } = state.selection;
        const isEmptyLine = $from.parent.textContent === "";
        const isTopLevel = $from.depth === 1; // only show at root level
        return isEmptyLine && isTopLevel;
      }}
    >
      <div style={{ position: "relative" }}>
        <Button
          variant="ghost"
          onClick={() => setPickerOpen((v) => !v)}
          title="Insert icon"
          style={{
            width: 24,
            height: 24,
          }}
        >
          <Smile className="tiptap-button-icon" size={16} strokeWidth={1.75} />
        </Button>

        {pickerOpen && (
          <IconPicker
            onSelect={(name) => {
              editor.chain().focus().insertIcon(name).run();
              setPickerOpen(false);
            }}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>
    </FloatingMenu>
  );
}
