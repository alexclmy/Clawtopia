import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => {
  return (
    <div className="ui-select-wrap">
      <select ref={ref} className={cn("ui-select", className)} {...props}>
        {children}
      </select>
      <span className="ui-select-caret" aria-hidden>
        v
      </span>
    </div>
  );
});
Select.displayName = "Select";

export { Select };
