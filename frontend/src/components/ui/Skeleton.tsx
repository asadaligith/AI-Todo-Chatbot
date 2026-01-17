"use client";

import { HTMLAttributes } from "react";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
  width?: string;
  height?: string;
}

/**
 * Skeleton loading component for displaying placeholder content
 *
 * @example
 * <Skeleton variant="text" width="w-3/4" />
 * <Skeleton variant="circular" width="w-12" height="h-12" />
 */
export default function Skeleton({
  variant = "rectangular",
  width = "w-full",
  height = "h-4",
  className = "",
  ...props
}: SkeletonProps) {
  const baseStyles =
    "animate-pulse bg-slate-200 dark:bg-slate-700";

  const variantStyles = {
    text: "rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg",
  };

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${width} ${height} ${className}`}
      role="status"
      aria-label="Loading"
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * MessageSkeleton - Skeleton for chat messages
 */
export function MessageSkeleton({ isUser = false }: { isUser?: boolean }) {
  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
      role="status"
      aria-label="Loading message"
    >
      <div
        className={`max-w-[80%] md:max-w-[70%] ${
          isUser
            ? "bg-blue-100 dark:bg-blue-900/30"
            : "bg-slate-100 dark:bg-slate-800"
        } rounded-2xl ${isUser ? "rounded-br-md" : "rounded-bl-md"} p-4 space-y-3`}
      >
        <div className="flex items-center gap-2">
          <Skeleton variant="circular" width="w-6" height="h-6" />
          <Skeleton variant="text" width="w-20" height="h-3" />
        </div>
        <div className="space-y-2">
          <Skeleton variant="text" width="w-full" height="h-4" />
          <Skeleton variant="text" width="w-4/5" height="h-4" />
          <Skeleton variant="text" width="w-3/4" height="h-4" />
        </div>
        <Skeleton variant="text" width="w-16" height="h-3" />
      </div>
    </div>
  );
}

/**
 * TaskCardSkeleton - Skeleton for task cards in sidebar
 */
export function TaskCardSkeleton() {
  return (
    <div
      className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700"
      role="status"
      aria-label="Loading task"
    >
      <div className="flex items-start gap-3">
        <Skeleton variant="circular" width="w-5" height="h-5" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="w-full" height="h-4" />
          <Skeleton variant="text" width="w-2/3" height="h-3" />
        </div>
      </div>
    </div>
  );
}
