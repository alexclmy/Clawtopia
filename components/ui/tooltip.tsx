import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  content: ReactNode;
  className?: string;
}

export function InfoTooltip({ content, className }: InfoTooltipProps) {
  return (
    <span className={cn("ui-info-tooltip", className)} tabIndex={0} aria-label={String(content)}>
      <span className="ui-info-tooltip-icon" aria-hidden>
        i
      </span>
      <span className="ui-info-tooltip-content" role="tooltip">
        {content}
      </span>
    </span>
  );
}
