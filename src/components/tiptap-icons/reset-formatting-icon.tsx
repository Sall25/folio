import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const ResetFormattingIcon = memo(({ className, ...props }: SvgProps) => {
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
      {/* Reset circular arrow */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 4C9.23858 4 7 6.23858 7 9C7 9.55228 6.55228 10 6 10C5.44772 10 5 9.55228 5 9C5 5.13401 8.13401 2 12 2C14.0503 2 15.9006 2.88023 17.2071 4.29289L18.2929 3.20711C18.9229 2.57714 20 3.02331 20 3.91421V8C20 8.55228 19.5523 9 19 9H14.9142C14.0233 9 13.5771 7.92286 14.2071 7.29289L15.7929 5.70711C14.8478 4.64446 13.4756 4 12 4Z"
      />

      {/* Slash (clear formatting) */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.29289 18.7071C4.90237 18.3166 4.90237 17.6834 5.29289 17.2929L17.2929 5.29289C17.6834 4.90237 18.3166 4.90237 18.7071 5.29289C19.0976 5.68342 19.0976 6.31658 18.7071 6.70711L6.70711 18.7071C6.31658 19.0976 5.68342 19.0976 5.29289 18.7071Z"
      />
    </svg>
  )
})

ResetFormattingIcon.displayName = "ResetFormattingIcon"