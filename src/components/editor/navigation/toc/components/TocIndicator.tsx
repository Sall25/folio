import { type Level } from "@tiptap/extension-heading";

export interface IndicatorProps {
  level: Level;
  highlight: boolean;
}

export function TocIndicator({ level, highlight = false }: IndicatorProps) {
  const widths = {
    1: 'w-4.5',
    2: 'w-3.5',
    3: 'w-2.5',
    4: 'w-1.5',
    5: 'w-1',
    6: 'w-1'
  }


  return (
    <div className="flex justify-center">
      <div
        className={`
          ${widths[level]} h-[2.5px]
          rounded
           transition-transform duration-200
          ${highlight
            ? 'bg-blue-400 dark:bg-white ring-0.5 ring-blue-500 opacity-100 scale-110'
            : 'bg-neutral-200 dark:bg-neutral-600 ring-0 opacity-60 scale-100'
          }
        `}
      />
    </div>
  )
}
