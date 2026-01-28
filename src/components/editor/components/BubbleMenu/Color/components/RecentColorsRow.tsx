/* eslint-disable @typescript-eslint/no-explicit-any */

type RecentColor = {
  css: string
}

export function RecentColorsRow({
  colors,
  current,
  onSelect,
  type = 'text' // 'text' | 'highlight'
}: {
  colors: RecentColor[]
  current?: string
  onSelect: (css: string) => void
  type?: 'text' | 'highlight'
}) {
  if (!colors.length) return null

  return (
    <div className="recent-colors">
      <div className="recent-colors__label">Recent</div>

      <div className="recent-colors__row">
        {colors.map((c, i) => (
          <span
            key={i}
            className={`recent-swatch ${current === c.css ? 'recent-swatch--active' : ''
              }`}
            style={{
              background: type === 'highlight' ? c.css : undefined,
              color: type === 'text' ? c.css : undefined,
              ['--ring-color' as any]: c.css
            }}
            onMouseDown={(e) => {
              e.preventDefault()
              onSelect(c.css)
            }}
          >
            {type === 'text' && 'A'}
          </span>
        ))}
      </div>
    </div>
  )
}
