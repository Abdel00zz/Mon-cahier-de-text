import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const RESTING_CIRCLE =
  "M24.5 14C24.5 19.799 19.799 24.5 14 24.5C8.20101 24.5 3.5 19.799 3.5 14C3.5 8.20101 8.20101 3.5 14 3.5C19.799 3.5 24.5 8.20101 24.5 14Z";

const SQUISH_CIRCLE =
  "M25.5 14C25.5 19.799 19.799 23.5 14 23.5C8.20101 23.5 2.5 19.799 2.5 14C2.5 8.20101 8.20101 4.5 14 4.5C19.799 4.5 25.5 8.20101 25.5 14Z";

export interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, checked, defaultChecked, onChange, id, ...props }, ref) => {
    const autoId = React.useId();
    const inputId = id ?? autoId;
    const [isPressed, setIsPressed] = React.useState(false);
    const [internalChecked, setInternalChecked] = React.useState(defaultChecked ?? false);
    const isChecked = checked !== undefined ? checked : internalChecked;

    return (
      <label
        htmlFor={inputId}
        onPointerDown={() => setIsPressed(true)}
        onPointerUp={() => setIsPressed(false)}
        onPointerLeave={() => setIsPressed(false)}
        className={cn(
          "radio group/radio relative inline-flex items-center gap-2.5 cursor-pointer select-none",
          props.disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <input
          ref={ref}
          id={inputId}
          type="radio"
          checked={checked}
          defaultChecked={defaultChecked}
          onChange={(e) => {
            setInternalChecked(e.target.checked);
            onChange?.(e);
          }}
          className="peer sr-only"
          {...props}
        />
        <div className="relative h-5.5 w-5.5 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 28 28" className="pointer-events-none h-6 w-6 overflow-visible" aria-hidden="true">
            <motion.path
              d={isPressed ? SQUISH_CIRCLE : RESTING_CIRCLE}
              transition={{ type: "spring", stiffness: 600, damping: 25 }}
              className={cn(
                "stroke-[1.5px] transition-colors duration-200",
                isChecked
                  ? "fill-primary stroke-primary"
                  : "fill-card stroke-muted-foreground/40 group-hover/radio:stroke-primary/50"
              )}
            />
          </svg>
          {isChecked && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 28 }}
              className="absolute h-2.5 w-2.5 rounded-full bg-primary-foreground pointer-events-none shadow-2xs"
            />
          )}
        </div>
        {label && <span className="text-sm font-medium text-foreground">{label}</span>}
      </label>
    );
  }
);
Radio.displayName = "Radio";
