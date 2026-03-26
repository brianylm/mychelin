"use client";

import { Button, DropdownMenu } from "@radix-ui/themes";
import { PlusIcon, CameraIcon } from "@radix-ui/react-icons";

interface SidebarToolbarProps {
  onCreateOpen: () => void;
  onPhotoScan?: () => void;
}

export function SidebarToolbar({
  onCreateOpen,
  onPhotoScan,
}: SidebarToolbarProps) {
  return (
    <div className="flex gap-2">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button size="2" className="flex-1">
            <PlusIcon className="mr-1 inline h-4 w-4" />
            New Recipe
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onClick={onCreateOpen}>
            <PlusIcon className="mr-2 inline h-4 w-4" />
            New blank recipe
          </DropdownMenu.Item>
          {onPhotoScan && (
            <DropdownMenu.Item onClick={onPhotoScan}>
              <CameraIcon className="mr-2 inline h-4 w-4" />
              Scan from photo
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
}
