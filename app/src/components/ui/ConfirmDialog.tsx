"use client";

import { Button } from "./Button";
import { Dialog } from "./Dialog";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// In-app replacement for window.confirm, built on the shared Dialog shell.
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      mobileFullHeight={false}
      hideCloseButton
      className="w-full max-w-sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            className={destructive ? "border-ui-danger" : undefined}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {message && <p className="text-sm text-ui-text">{message}</p>}
    </Dialog>
  );
}
