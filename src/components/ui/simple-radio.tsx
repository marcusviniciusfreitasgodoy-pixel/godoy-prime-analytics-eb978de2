import * as React from "react";
import { cn } from "@/lib/utils";

interface SimpleRadioGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

interface SimpleRadioItemProps {
  value: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

const SimpleRadioContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
} | null>(null);

export function SimpleRadioGroup({ 
  value, 
  onValueChange, 
  className, 
  children 
}: SimpleRadioGroupProps) {
  return (
    <SimpleRadioContext.Provider value={{ value, onValueChange }}>
      <div role="radiogroup" className={className}>
        {children}
      </div>
    </SimpleRadioContext.Provider>
  );
}

export function SimpleRadioItem({ 
  value, 
  id, 
  className,
  disabled 
}: SimpleRadioItemProps) {
  const context = React.useContext(SimpleRadioContext);
  
  if (!context) {
    throw new Error("SimpleRadioItem must be used within SimpleRadioGroup");
  }

  const isChecked = context.value === value;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isChecked}
      id={id}
      disabled={disabled}
      onClick={() => !disabled && context.onValueChange(value)}
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center",
        className
      )}
    >
      {isChecked && (
        <div className="h-2.5 w-2.5 rounded-full bg-primary" />
      )}
    </button>
  );
}
