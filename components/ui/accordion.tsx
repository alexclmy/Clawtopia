import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Accordion({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={cn("ui-accordion", className)} {...props}>
      {children}
    </div>
  );
}

export function AccordionItem({
  className,
  children,
  defaultOpen = false
}: {
  className?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className={cn("ui-accordion-item", className)} open={defaultOpen}>
      {children}
    </details>
  );
}

export function AccordionTrigger({
  className,
  children
}: {
  className?: string;
  children: ReactNode;
}) {
  return <summary className={cn("ui-accordion-trigger", className)}>{children}</summary>;
}

export function AccordionContent({
  className,
  children
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("ui-accordion-content", className)}>{children}</div>;
}

