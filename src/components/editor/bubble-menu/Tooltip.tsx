export default function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group relative flex">
      {children}
      <div
        className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2
        whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-xs
        text-white opacity-0 shadow-md transition-opacity
        group-hover:opacity-100 dark:bg-neutral-700"
      >
        {label}
      </div>
    </div>
  )
}
