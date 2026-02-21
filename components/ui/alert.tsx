import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type AlertVariant = "default" | "success" | "error" | "warning";

export function Alert({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: AlertVariant }) {
  return <div className={cn("ui-alert", `ui-alert--${variant}`, className)} role="status" {...props} />;
}
