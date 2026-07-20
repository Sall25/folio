import { memo } from "react";

type SvgProps = React.ComponentPropsWithoutRef<"svg">;

export const SettingsSlidersIcon = memo(({ className, ...props }: SvgProps) => {
  return (
    <svg
      width="24"
      height="24"
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Top track — knob right of centre */}
      <path d="M3 8C3 7.44772 3.44772 7 4 7H12.1707C12.5825 5.83481 13.6938 5 15 5C16.3062 5 17.4175 5.83481 17.8293 7H20C20.5523 7 21 7.44772 21 8C21 8.55228 20.5523 9 20 9H17.8293C17.4175 10.1652 16.3062 11 15 11C13.6938 11 12.5825 10.1652 12.1707 9H4C3.44772 9 3 8.55228 3 8Z" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15 6.5C14.1716 6.5 13.5 7.17157 13.5 8C13.5 8.82843 14.1716 9.5 15 9.5C15.8284 9.5 16.5 8.82843 16.5 8C16.5 7.17157 15.8284 6.5 15 6.5Z"
        fill="var(--tt-bg-color, #fff)"
      />

      {/* Bottom track — knob left of centre */}
      <path d="M3 16C3 15.4477 3.44772 15 4 15H6.17071C6.58254 13.8348 7.69378 13 9 13C10.3062 13 11.4175 13.8348 11.8293 15H20C20.5523 15 21 15.4477 21 16C21 16.5523 20.5523 17 20 17H11.8293C11.4175 18.1652 10.3062 19 9 19C7.69378 19 6.58254 18.1652 6.17071 17H4C3.44772 17 3 16.5523 3 16Z" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 14.5C8.17157 14.5 7.5 15.1716 7.5 16C7.5 16.8284 8.17157 17.5 9 17.5C9.82843 17.5 10.5 16.8284 10.5 16C10.5 15.1716 9.82843 14.5 9 14.5Z"
        fill="var(--tt-bg-color, #fff)"
      />
    </svg>
  );
});

SettingsSlidersIcon.displayName = "SettingsSlidersIcon";
