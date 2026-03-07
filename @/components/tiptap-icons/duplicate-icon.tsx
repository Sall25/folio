import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const DuplicateIcon = memo(({ className, ...props }: SvgProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect x="7" y="7" width="12" height="12" rx="2" />
      <rect x="3" y="3" width="12" height="12" rx="2" />
    </svg>
  )
})

DuplicateIcon.displayName = "DuplicateIcon"