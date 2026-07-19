import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "motion-safe:animate-pulse rounded-md bg-[var(--ui-border)]/70",
        className
      )}
      {...props}
    />
  );
}

export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto grid w-full max-w-6xl gap-6 px-5 py-6 sm:px-8",
        className
      )}
      role="status"
      aria-label="Loading page"
    >
      <div className="grid gap-3 border-b border-[var(--ui-border)] pb-5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-52 max-w-full" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
