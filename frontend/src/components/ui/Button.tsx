"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

/**
 * Button component with multiple variants and accessibility features
 *
 * @example
 * <Button variant="primary" onClick={handleClick}>Click me</Button>
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95";

    const variantStyles = {
      primary:
        "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600",
      secondary:
        "bg-slate-100 hover:bg-slate-200 text-slate-900 focus:ring-slate-500 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100",
      ghost:
        "hover:bg-slate-100 text-slate-700 focus:ring-slate-500 dark:hover:bg-slate-800 dark:text-slate-300",
      destructive:
        "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 dark:bg-red-700 dark:hover:bg-red-600",
    };

    const sizeStyles = {
      sm: "text-xs px-3 py-1.5 rounded-md gap-1.5",
      md: "text-sm px-4 py-2 rounded-lg gap-2",
      lg: "text-base px-6 py-3 rounded-lg gap-2",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <span className="loading-dots flex gap-1" aria-label="Loading">
              <span className="loading-dot w-1.5 h-1.5 bg-current rounded-full"></span>
              <span className="loading-dot w-1.5 h-1.5 bg-current rounded-full"></span>
              <span className="loading-dot w-1.5 h-1.5 bg-current rounded-full"></span>
            </span>
            <span className="sr-only">Loading...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
