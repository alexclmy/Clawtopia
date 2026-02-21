import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <span className={cn("ui-spinner", className)} aria-label="loading" />;
}
