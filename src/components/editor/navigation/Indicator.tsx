import { type Level } from "./types";

export interface IndicatorProps {
  level: Level;
  highlight: boolean;
}

export function Indicator({ level, highlight = false }: IndicatorProps) {
  const widths = {
    '1': 'w-6',
    '2': 'w-5',
    '3': 'w-4',
    '4': 'w-2',
  };


  return (
    <div className="flex justify-center w-8"> {/* container width max */}
      <div
        className={`
          ${widths[level]} h-[3px]
          ${highlight ? 'bg-blue-400' : 'bg-neutral-200'}
           dark:bg-gray-800
          rounded ring-0.5 ring-blue-500
          transition-all duration-200
          hover:scale-110 hover:bg-blue-300 dark:hover:bg-blue-400
          cursor-pointer
          opacity-60

        `}

      />
    </div>
  );
}
