export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export interface PendingConfirm extends ConfirmOptions {
  id: number;
}

// Framework-free core of the in-app confirm: one pending request at a time.
// A new request while one is open cancels the older one (resolves false).
export function createConfirmController(onChange: (pending: PendingConfirm | null) => void) {
  let nextId = 0;
  let current: { pending: PendingConfirm; resolve: (value: boolean) => void } | null = null;

  const settle = (value: boolean) => {
    if (!current) return;
    const { resolve } = current;
    current = null;
    onChange(null);
    resolve(value);
  };

  const confirm = (options: ConfirmOptions) =>
    new Promise<boolean>((resolve) => {
      settle(false);
      const pending = { ...options, id: nextId++ };
      current = { pending, resolve };
      onChange(pending);
    });

  return { confirm, settle };
}
