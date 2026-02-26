import './tocIndicator.scss'

import { type Level } from "@tiptap/extension-heading";

export interface IndicatorProps {
  level: Level;
  highlight: boolean;
}

export function TocIndicator({ level, highlight = false }: IndicatorProps) {
  const widths = {
    1: '22px',
    2: '18px',
    3: '16px',
    4: '12px',
    5: '8px',
    6: '6px'
  }


  return (
    // <CardItemGroup
    //   orientation="vertical"
    // >

    // </CardItemGroup>
    <div
      className={`toc-indicator ${highlight ? 'highlight' : ''}`}
      // className='toc-indicator'
      style={{
        width: `${widths[level]}`,
        // background: 'white',
        // height: '20px'
      }}

    />
  )
}
