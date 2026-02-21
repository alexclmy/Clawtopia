"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used inside <Tabs>.");
  }
  return context;
}

export function Tabs({
  value,
  defaultValue,
  onValueChange,
  className,
  children
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [innerValue, setInnerValue] = React.useState(defaultValue || "");
  const current = value !== undefined ? value : innerValue;

  const setValue = React.useCallback(
    (next: string) => {
      if (value === undefined) {
        setInnerValue(next);
      }
      onValueChange?.(next);
    },
    [onValueChange, value]
  );

  return (
    <TabsContext.Provider value={{ value: current, setValue }}>
      <div className={cn("ui-tabs", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("ui-tabs-list", className)}>{children}</div>;
}

export function TabsTrigger({
  value,
  className,
  children
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { value: current, setValue } = useTabsContext();
  const isActive = current === value;

  return (
    <button
      type="button"
      className={cn("ui-tabs-trigger", isActive ? "is-active" : "", className)}
      onClick={() => setValue(value)}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { value: current } = useTabsContext();
  if (current !== value) {
    return null;
  }

  return <div className={cn("ui-tabs-content", className)}>{children}</div>;
}

