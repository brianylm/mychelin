"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  createConfirmController,
  type ConfirmOptions,
  type PendingConfirm,
} from "@/lib/confirm-controller";

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

// Without a provider (isolated tests) fall back to the native prompt.
const fallbackConfirm: ConfirmFn = async (options) =>
  typeof window !== "undefined" &&
  window.confirm([options.title, options.message].filter(Boolean).join("\n"));

const ConfirmContext = createContext<ConfirmFn>(fallbackConfirm);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  // Created once; setPending is stable, so the controller never changes.
  const [controller] = useState(() => createConfirmController(setPending));

  const confirm = useCallback<ConfirmFn>((options) => controller.confirm(options), [controller]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={pending !== null}
        title={pending?.title ?? ""}
        message={pending?.message}
        confirmLabel={pending?.confirmLabel}
        cancelLabel={pending?.cancelLabel}
        destructive={pending?.destructive}
        onConfirm={() => controller.settle(true)}
        onCancel={() => controller.settle(false)}
      />
    </ConfirmContext.Provider>
  );
}

// `const confirm = useConfirm(); if (await confirm({ title, ... })) { ... }`
export function useConfirm() {
  return useContext(ConfirmContext);
}
