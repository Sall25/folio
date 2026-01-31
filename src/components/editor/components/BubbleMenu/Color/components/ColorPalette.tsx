/* eslint-disable @typescript-eslint/no-explicit-any */
import { COLORS } from "../colors";
import { useColorContext } from "../context/colorContext";
import { RecentColorsRow } from "./RecentColorsRow";

export function ColorPalette() {
  const {
    currentColor,
    addRecentColor,
    recent,
    editor
  } = useColorContext();

  if (!editor) return null;

  return (
    <div className="color-palette">
      <RecentColorsRow
        colors={recent.text}
        current={currentColor}
        type="text"
        onSelect={(css) => {
          editor.chain().focus().toggleTextStyle({ color: css }).run()
        }}
      />
      <span className="color-palette__label">Color</span>
      <div className="color-palette__grid">
        {COLORS.map(c => (
          <span
            key={c.name}
            className={`color-swatch ${currentColor === c.css ? 'color-swatch--active' : ''
              }`}
            style={{
              color: c.css,
              ['--ring-color' as any]: c.css
            }}
            onMouseDown={(e) => {
              e.preventDefault()
              editor.chain().focus().toggleTextStyle({ color: c.css }).run();
              addRecentColor({ css: c.css }, 'text')
            }}
          >
            A
          </span>


        ))}
      </div>
    </div>
  );
}