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
  info: "border-blue-200 bg-blue-50 text-blue-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  danger: "border-red-200 bg-red-50 text-red-900",
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
