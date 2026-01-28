/* eslint-disable @typescript-eslint/no-explicit-any */
import { useColorContext } from "../context/colorContext"
import { HIGHLIGHT_COLORS } from "../highlight_colors"
import { RecentColorsRow } from "./RecentColorsRow"

export function HighlightPalette() {
  const { currentHighlight, recent, editor, addRecentColor } = useColorContext()
  if (!editor) return null


  return (
    <div className="highlight-palette">
      <RecentColorsRow
        colors={recent.highlight}
        current={currentHighlight}
        type="highlight"
        onSelect={(css) => {
          editor.chain().focus().toggleTextStyle({ backgroundColor: css }).run()
        }}
      />
      <span className="highlight-palette__label">Background</span>


      <div className="highlight-palette__grid">
        {HIGHLIGHT_COLORS.map(c => (
          <span
            key={c.name}
            className={`highlight-swatch ${currentHighlight === c.css ? 'highlight-swatch--active' : ''
              }`}
            style={{
              background: c.css,
              ['--ring-color' as any]: c.css
            }}
            onMouseDown={(e) => {
              e.preventDefault()
              editor.chain().focus().toggleTextStyle({ backgroundColor: c.css }).run()
              addRecentColor({ css: c.css }, 'highlight')
            }}
          />
        ))}
      </div>
    </div>
  );
}
