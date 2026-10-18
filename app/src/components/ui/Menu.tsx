"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

// Token-styled dropdown menu over the unstyled Radix primitive. Mirrors the
// Root / Trigger / Content / Item shape the app already used, so call sites
// only change their import. Trigger always wraps its child (asChild).

function Trigger({ children }: { children: ReactNode }) {
  return <DropdownMenu.Trigger asChild>{children}</DropdownMenu.Trigger>;
}

function Content({
  className,
  align = "start",
  sideOffset = 6,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-44 rounded-lg border border-ui-border bg-ui-surface-raised p-1 shadow-lg",
          className
        )}
        {...props}
      />
    </DropdownMenu.Portal>
  );
}

interface ItemProps extends ComponentPropsWithoutRef<typeof DropdownMenu.Item> {
  tone?: "default" | "danger";
}

function Item({ className, tone = "default", ...props }: ItemProps) {
  return (
    <DropdownMenu.Item
      className={cn(
        "flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm font-medium outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-55",
        tone === "danger"
          ? "text-ui-danger data-[highlighted]:bg-ui-danger-soft"
          : "text-ui-text data-[highlighted]:bg-ui-accent-muted",
        className
      )}
      {...props}
    />
  );
}

export const Menu = {
  Root: DropdownMenu.Root,
  Trigger,
  Content,
  Item,
};
