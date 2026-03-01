import './tocIndicator.scss'

import { type Level } from "@tiptap/extension-heading";

export interface IndicatorProps {
  level: Level;
  highlight: boolean;
}

export function TocIndicator({ level, highlight = false }: IndicatorProps) {
  const widths = {
    1: '16px',
    2: '11px',
    3: '8px',
    4: '5px',
    5: '3px',
    6: '1px'
  }


  return (
    <div
      className={`toc-indicator ${highlight ? 'highlight' : ''}`}
      // className='toc-indicator'
      style={{
        width: `${widths[level]}`,


      }}

    />
  )
}
