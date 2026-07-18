import * as React from "react";
import "./input.scss";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`tiptap-input ${className}`.trim()}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

type InputGroupProps = React.HTMLAttributes<HTMLDivElement>;

export const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`tiptap-input-group ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    );
  },
);

InputGroup.displayName = "InputGroup";
