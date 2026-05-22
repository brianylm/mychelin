"use client";

import { Button } from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";

interface SidebarToolbarProps {
  onCreateOpen: () => void;
}

export function SidebarToolbar({ onCreateOpen }: SidebarToolbarProps) {
  return (
    <div className="flex gap-2">
      <Button size="2" className="flex-1" onClick={onCreateOpen}>
        <PlusIcon className="mr-1 inline h-4 w-4" />
        New Recipe
      </Button>
    </div>
  );
}
