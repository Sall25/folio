/* eslint-disable @typescript-eslint/no-explicit-any */

import { Button } from "../../../../Components"
import { CardGroupLabel, CardItemGroup } from "../../../../Components/card"
import { ColorHighlightButton } from "../../../../Components/color-highlight-button"
import { useColorContext } from "../context/colorContext"

type RecentColor = {
  css: string
}

export function RecentColorsRow({
  colors,
  //current,
  onSelect,
  type = 'text' // 'text' | 'highlight'
}: {
  colors: RecentColor[]
  current?: string
  onSelect: (css: string) => void
  type?: 'text' | 'highlight'
}) {

  const { editor } = useColorContext()

  if (!colors.length) return null

  return (
    <CardItemGroup orientation="vertical">
      <CardGroupLabel>Recent</CardGroupLabel>

      <CardItemGroup orientation="horizontal">
        {colors.map((c) => (
          <span key={c.css}>
            {type === 'highlight' && (
              <ColorHighlightButton
                editor={editor}
                highlightColor={c.css}
              />
            )}

            {type === 'text' && (
              <Button
                style={{ color: c.css, outline: c.css }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  onSelect(c.css)
                }}
              >
                A
              </Button>
            )}
          </span>
        ))}
      </CardItemGroup>
    </CardItemGroup>

    // <div className="recent-colors">


    //   {/* <div className="recent-colors__row">
    //     {colors.map((c, i) => (
    //       <span
    //         key={i}
    //         className={`recent-swatch ${current === c.css ? 'recent-swatch--active' : ''
    //           }`}
    //         style={{
    //           background: type === 'highlight' ? c.css : undefined,
    //           color: type === 'text' ? c.css : undefined,
    //           ['--ring-color' as any]: c.css
    //         }}
    //         onMouseDown={(e) => {
    //           e.preventDefault()
    //           onSelect(c.css)
    //         }}
    //       >
    //         {type === 'text' && 'A'}
    //       </span>
    //     ))}
    //   </div> */}
    // </div>
  )
}
