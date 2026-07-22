"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "./IconButton";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  // Render as a full-height sheet on narrow screens (default true) — the
  // kitchen/mobile pattern used by capture and planner modals.
  mobileFullHeight?: boolean;
  // Hide the default close control when the content provides its own.
  hideCloseButton?: boolean;
  className?: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Shared modal shell: solid warm surface, focus trap with return, Escape to
// close, body scroll lock, and a labelled header/footer structure. Built so
// capture, planner, and recipe dialogs stop hand-rolling these behaviors.
export function Dialog({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  mobileFullHeight = true,
  hideCloseButton = false,
  className,
}: DialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // Capture the element to return focus to before the dialog opens.
  useEffect(() => {
    if (open) {
      restoreFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    }
  }, [open]);

  // Body scroll lock while open.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Escape closes; focus returns to the opener on unmount.
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !panelRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
    };
  }, [open, onClose]);

  // Move focus into the dialog when it opens.
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const firstFocusable = panelRef.current.querySelector<HTMLElement>(
      FOCUSABLE_SELECTOR
    );
    (firstFocusable ?? panelRef.current).focus();
  }, [open]);

  const handleOverlayMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) onClose();
    },
    [onClose]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onMouseDown={handleOverlayMouseDown}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "flex w-full flex-col border border-ui-border bg-ui-surface-raised shadow-xl outline-none",
          mobileFullHeight
            ? "h-[100dvh] rounded-none sm:h-auto sm:max-h-[85vh] sm:max-w-lg sm:rounded-2xl"
            : "max-h-[85vh] max-w-lg rounded-2xl",
          className
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-ui-border px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-ui-text">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-sm text-ui-muted">{subtitle}</p>
            )}
          </div>
          {!hideCloseButton && (
            <IconButton aria-label="Close dialog" variant="quiet" onClick={onClose}>
              <X className="h-5 w-5" />
            </IconButton>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {children}
        </div>

        {footer && (
          <div className="border-t border-ui-border px-4 py-3 sm:px-5 sm:py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
