"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Dialog } from "./Dialog";

interface WorkflowDialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  // Step-driven subtitle, e.g. "Paste text" → "Extracting…" → "Review".
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  mobileFullHeight?: boolean;
  className?: string;
}

// Shared shell for multi-step capture workflows (paste/url import, AI
// draft, manual scratchpad). Everything modal-ish — overlay, focus
// trap, Escape, scroll-lock — comes from Dialog; this adds the step
// bodies the capture flows share.
export function WorkflowDialog({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  mobileFullHeight = true,
  className,
}: WorkflowDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      footer={footer}
      mobileFullHeight={mobileFullHeight}
      className={className}
    >
      {children}
    </Dialog>
  );
}

export function WorkflowProcessing({ label }: { label: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-10"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 animate-spin text-ui-accent" aria-hidden="true" />
      <p className="text-sm text-ui-muted">{label}</p>
    </div>
  );
}

interface WorkflowErrorProps {
  // User-first headline, e.g. "Extraction didn't work".
  title: string;
  // Plain-language explanation + what the user can do next.
  message: ReactNode;
  // Developer/operator detail (API error bodies, env-var setup notes) —
  // shown collapsed so it never headlines for end users.
  technicalDetails?: ReactNode;
  // Recovery actions (retry, back to edit, save as draft…).
  children?: ReactNode;
}

export function WorkflowError({ title, message, technicalDetails, children }: WorkflowErrorProps) {
  return (
    <div className="py-2">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ui-danger-soft text-ui-danger">
          <AlertTriangle className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ui-text">{title}</h3>
          <div className="mt-1 text-sm leading-6 text-ui-muted">{message}</div>
        </div>
      </div>
      {technicalDetails && (
        <details className="mt-3 rounded-lg border border-ui-border bg-ui-surface-subtle px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-ui-muted">
            Technical details
          </summary>
          <div className="mt-2 text-xs leading-5 text-ui-muted">{technicalDetails}</div>
        </details>
      )}
      {children && <div className="mt-4 flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
