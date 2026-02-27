import './tocIndicator.scss'

import { type Level } from "@tiptap/extension-heading";

export interface IndicatorProps {
  level: Level;
  highlight: boolean;
}

export function TocIndicator({ level, highlight = false }: IndicatorProps) {
  const widths = {
    1: '16px',
    2: '14px',
    3: '12px',
    4: '8px',
    5: '5px',
    6: '3px'
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
