import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const ColorIcon = memo(({ className, ...props }: SvgProps) => {
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
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 3C12 3 6 10 6 14C6 17.3137 8.68629 20 12 20C15.3137 20 18 17.3137 18 14C18 10 12 3 12 3ZM12 18C9.79086 18 8 16.2091 8 14.5C8 12.5 10.5 8.5 12 6.5C13.5 8.5 16 12.5 16 14.5C16 16.2091 14.2091 18 12 18Z"
      />
    </svg>
  )
})

ColorIcon.displayName = "ColorIcon"