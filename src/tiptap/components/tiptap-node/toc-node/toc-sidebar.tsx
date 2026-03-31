import { TocProgress } from './toc-progress-bar'
import { TocContent } from './toc-content'

interface Props {
  maxShowCount?: number
  topOffset?: number
  className?: string
}

export function TocSidebar({ maxShowCount = 20, topOffset = 0, className = '' }: Props) {

  return (
    <aside
      className={`toc-sidebar ${className}`}
    >
      <TocProgress
        maxShowCount={maxShowCount}
      />
      <TocContent
        maxShowCount={maxShowCount}
        topOffset={topOffset}
      />
    </aside>
  )
}