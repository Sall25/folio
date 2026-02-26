/* eslint-disable @typescript-eslint/no-explicit-any */
import { useColorContext } from "../context/colorContext"
import { HIGHLIGHT_COLORS } from "../highlight_colors"
import { Card, CardBody, CardItemGroup } from "../../../../Components/card"
import { ButtonGroup } from "../../../../Components"
import { ColorHighlightButton, useColorHighlight } from "../../../../Components/color-highlight-button"
import { useIsBreakpoint } from "../../../../Components/hooks/use-is-breakpoint"
import { useMemo, useRef, useState } from "react"
import { useMenuNavigation } from "../../../../Components/hooks/use-menu-navigation"
import { RecentColorsRow } from "./RecentColorsRow"

interface HighlightPaletteProps {
  useColorValue?: boolean
}

export function HighlightPalette({ useColorValue = false }: HighlightPaletteProps) {
  const { editor, recent, currentColor, addRecentColor } = useColorContext()
  const { handleRemoveHighlight } = useColorHighlight({ editor })
  const [colors,] = useState(HIGHLIGHT_COLORS)

  const containerRef = useRef<HTMLDivElement>(null)

  const menuItems = useMemo(
    () => [...colors, { label: "Remove highlight", value: "none" }],
    [colors]
  )

  const { selectedIndex } = useMenuNavigation({
    containerRef,
    items: menuItems,
    orientation: "both",
    onSelect: (item) => {
      if (!containerRef.current) return false
      const highlightedElement = containerRef.current.querySelector(
        '[data-highlighted="true"]'
      ) as HTMLElement
      if (highlightedElement) highlightedElement.click()
      if (item.value === "none") handleRemoveHighlight()

      return true
    },
    autoSelectFirstItem: false,
  })

  return (
    // <Card
    //   ref={containerRef}
    //   style={isMobile ? { boxShadow: "none", border: 0 } : {}}
    // >
    //   <CardBody>

    //   </CardBody>
    // </Card>

    // <CardItemGroup orientation="horizontal">
    //   <ButtonGroup orientation="horizontal">
    //     {HIGHLIGHT_COLORS.slice(0, 5).map((color, index) => (
    //       <ColorHighlightButton
    //         key={color.value}
    //         editor={editor}
    //         highlightColor={useColorValue ? color.colorValue : color.value}
    //         tooltip={color.label}
    //         aria-label={`${color.label} highlight color`}
    //         tabIndex={index === selectedIndex ? 0 : -1}
    //         data-highlighted={selectedIndex === index}
    //         useColorValue={useColorValue}

    //       />
    //     ))}
    //   </ButtonGroup>
    // </CardItemGroup>

    <CardItemGroup orientation="vertical">
      <RecentColorsRow
        colors={recent.highlight}
        current={currentColor}
        type="highlight"
        onSelect={(css) => {
          editor.chain().focus().toggleHighlight({ color: css }).run()
        }}
      />
      <span
        style={{
          fontSize: '12px',
          fontWeight: 'bold',
          paddingLeft: '10px'
        }}
      >
        Background
      </span>

      {/* First group of 5 */}
      <ButtonGroup orientation="horizontal">
        {HIGHLIGHT_COLORS.slice(0, 5).map((color, index) => (
          <ColorHighlightButton
            key={color.value}
            editor={editor}
            highlightColor={useColorValue ? color.colorValue : color.value}
            tooltip={color.label}
            aria-label={`${color.label} highlight color`}
            tabIndex={index === selectedIndex ? 0 : -1}
            data-highlighted={selectedIndex === index}
            useColorValue={useColorValue}
            onClick={() => {
              addRecentColor({ css: color.colorValue }, 'highlight')
            }}
          />
        ))}
      </ButtonGroup>

      {/* Second group of 5 */}
      <ButtonGroup orientation="horizontal">
        {HIGHLIGHT_COLORS.slice(5, 10).map((color, index) => (
          <ColorHighlightButton
            key={color.value}
            editor={editor}
            highlightColor={useColorValue ? color.colorValue : color.value}
            tooltip={color.label}
            aria-label={`${color.label} highlight color`}
            tabIndex={index + 5 === selectedIndex ? 0 : -1} // adjust index
            data-highlighted={selectedIndex === index + 5}
            useColorValue={useColorValue}
          />
        ))}
      </ButtonGroup>
    </CardItemGroup>


    // <div className="highlight-palette">
    //   <RecentColorsRow
    //     colors={recent.highlight}
    //     current={currentHighlight}
    //     type="highlight"
    //     onSelect={(css) => {
    //       editor.chain().focus().toggleTextStyle({ backgroundColor: css }).run()
    //     }}
    //   />
    //   <span className="highlight-palette__label">Background</span>


    //   <div className="highlight-palette__grid">
    //     {HIGHLIGHT_COLORS.map(c => (
    //       // <span
    //       //   key={c.name}
    //       //   className={`highlight-swatch ${currentHighlight === c.css ? 'highlight-swatch--active' : ''
    //       //     }`}
    //       //   style={{
    //       //     background: c.css,
    //       //     ['--ring-color' as any]: c.css
    //       //   }}
    //       //   onMouseDown={(e) => {
    //       //     e.preventDefault()
    //       //     editor.chain().focus().toggleTextStyle({ backgroundColor: c.css }).run()
    //       //     addRecentColor({ css: c.css }, 'highlight')
    //       //   }}
    //       // />
    //       <Circle
    //         key={c.css}
    //         size={25}
    //         fill={c.css}
    //         stroke={c.css}
    //         style={{

    //           ['--ring-color' as any]: c.css
    //         }} onMouseDown={(e) => {
    //           e.preventDefault()
    //           editor.chain().focus().toggleTextStyle({ backgroundColor: c.css }).run()
    //           addRecentColor({ css: c.css }, 'highlight')
    //         }} />
    //     ))}
    //   </div>
    // </div>
  );
}
