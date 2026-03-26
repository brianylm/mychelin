"use client";

import { useState, useEffect, useRef } from "react";
import { Button, Tooltip } from "@radix-ui/themes";
import { CopyIcon, TrashIcon, Cross2Icon, PlusIcon } from "@radix-ui/react-icons";

interface SpeedDialFABProps {
  onDuplicate?: () => void;
  onDelete?: () => void;
}

export function SpeedDialFAB({ onDuplicate, onDelete }: SpeedDialFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  const actions = [
    ...(onDuplicate
      ? [
          {
            icon: <CopyIcon className="h-4 w-4" />,
            label: "Duplicate Recipe",
            onClick: () => {
              onDuplicate();
              setIsOpen(false);
            },
          },
        ]
      : []),
    ...(onDelete
      ? [
          {
            icon: <TrashIcon className="h-4 w-4" />,
            label: "Delete Recipe",
            onClick: () => {
              onDelete();
              setIsOpen(false);
            },
            color: "text-red-500",
          },
        ]
      : []),
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) setIsOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  if (actions.length === 0) return null;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-neutral-950/20 backdrop-blur-[2px]"
          onClick={() => setIsOpen(false)}
        />
      )}
      <div
        ref={fabRef}
        className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3"
      >
        {isOpen && (
          <div className="flex flex-col-reverse items-end gap-3 pb-2">
            {actions.map((action, index) => (
              <div
                key={index}
                className="flex animate-fade-in items-center gap-3"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: "backwards",
                }}
              >
                <span className="whitespace-nowrap rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
                  {action.label}
                </span>
                <Tooltip content={action.label}>
                  <Button
                    type="button"
                    onClick={action.onClick}
                    variant="solid"
                    size="3"
                    radius="full"
                    className="group flex h-12 w-12 items-center justify-center shadow-lg transition-all hover:scale-110"
                    style={{
                      backgroundColor: "#262626",
                      color: action.color ?? "#ffffff",
                      border: "1px solid #404040",
                    }}
                  >
                    {action.icon}
                  </Button>
                </Tooltip>
              </div>
            ))}
          </div>
        )}
        <Tooltip content={isOpen ? "Close menu" : "Quick actions"}>
          <Button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            variant="solid"
            size="4"
            radius="full"
            className="group flex h-14 w-14 items-center justify-center shadow-lg transition-all hover:scale-105"
            style={{
              backgroundColor: "#d97706",
              color: "#ffffff",
              border: "1px solid #b45309",
            }}
          >
            {isOpen ? (
              <Cross2Icon width={20} height={20} />
            ) : (
              <PlusIcon width={20} height={20} />
            )}
          </Button>
        </Tooltip>
      </div>
    </>
  );
}
