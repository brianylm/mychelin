import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AlertTone = "info" | "success" | "warning" | "danger";

interface AlertProps {
  tone?: AlertTone;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}

const tones: Record<AlertTone, string> = {
  info: "border-ui-info/20 bg-ui-info-soft text-ui-info",
  success: "border-ui-success/20 bg-ui-success-soft text-ui-success",
  warning: "border-ui-warning/25 bg-ui-warning-soft text-ui-warning-text",
  danger: "border-ui-danger/20 bg-ui-danger-soft text-ui-danger",
};

export function Alert({ tone = "info", title, children, className }: AlertProps) {
  return (
    <div
      className={cn("rounded-lg border px-3 py-2.5 text-sm", tones[tone], className)}
      role={tone === "danger" ? "alert" : "status"}
    >
      {title && <p className="mb-0.5 font-semibold">{title}</p>}
      <div className="text-sm leading-5">{children}</div>
    </div>
  );
}
