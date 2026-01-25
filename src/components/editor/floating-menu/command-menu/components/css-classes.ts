
export const slashDropdownClass = `flex flex-col gap-1 p-1.5 min-w-[220px] max-w-[320px] max-h-[280px] overflow-y-auto
                rounded-xl border border-black/10 dark:border-white/10
                bg-white dark:bg-neutral-900
                shadow-lg animate-in fade-in zoom-in-95`;

export const buttonClass = (index: number, selectedIndex: number) =>
  `flex flex-col gap-0.5 px-2.5 py-2 rounded-lg cursor-pointer select-none
  transition-colors active:scale-[0.98]
  hover:bg-black/5 dark:hover:bg-white/5
  ${index === selectedIndex ? 'bg-blue-500/10 dark:bg-blue-400/20' : ''}`;