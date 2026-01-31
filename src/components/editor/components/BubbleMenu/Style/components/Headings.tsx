import { useStyleContext } from "../context/styleContext";
import type { Level } from "@tiptap/extension-heading";
import { useEditorState } from "@tiptap/react";
import { Heading1, Heading2, Heading3 } from "lucide-react";

const levels = [1, 2, 3] as Level[];

export function Headings() {
  const { editor } = useStyleContext();

  const { isActiveLevel } = useEditorState({
    editor,
    selector: ctx => {
      return {
        isActiveLevel: (level: Level) => ctx.editor.isActive('heading', { level }) ?? false
      }
    }
  })

  const icons = [
    Heading1,
    Heading2,
    Heading3
  ];

  return (
    <>
      {levels.map((level, index) => {
        const Icon = icons[index];

        return (
          <span
            key={level}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level }).run()
            }
            className={`dropdown-item ${isActiveLevel(level) ? 'selected' : ''}`}
          >
            <Icon
              className="icon"
              size={20}
            />
            <span>Heading {level}</span>
          </span>
        )
      })}
    </>
  );
}
