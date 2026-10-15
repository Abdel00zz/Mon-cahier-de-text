import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const RESTING_BOX =
  "M3.5 8.49964C3.5 5.73822 5.73822 3.5 8.49964 3.5C10.3275 3.5 12.3499 3.5 14 3.5C15.6501 3.5 17.6725 3.5 19.5004 3.5C22.2618 3.5 24.5 5.73822 24.5 8.49964C24.5 10.3275 24.5 12.3499 24.5 14C24.5 15.6501 24.5 17.6725 24.5 19.5004C24.5 22.2618 22.2618 24.5 19.5004 24.5C17.6725 24.5 15.6501 24.5 14 24.5C12.3499 24.5 10.3275 24.5 8.49964 24.5C5.73822 24.5 3.5 22.2618 3.5 19.5004C3.5 17.6725 3.5 15.6501 3.5 14C3.5 12.3499 3.5 10.3275 3.5 8.49964Z";

const SQUISH_BOX =
  "M3.76792 8.316C3.29262 5.68859 5.68858 3.29262 8.316 3.76792C10.2859 4.12429 12.3921 4.41667 14 4.41667C15.6079 4.41667 17.7141 4.12429 19.684 3.76792C22.3114 3.29262 24.7074 5.68858 24.2321 8.316C23.8757 10.2859 23.5833 12.3921 23.5833 14C23.5833 15.6079 23.8757 17.7141 24.2321 19.684C24.7074 22.3114 22.3114 24.7074 19.684 24.2321C17.7141 23.8757 15.6079 23.5833 14 23.5833C12.3921 23.5833 10.2859 23.8757 8.316 24.2321C5.68859 24.7074 3.29262 22.3114 3.76792 19.684C4.12429 17.7141 4.41667 15.6079 4.41667 14C4.41667 12.3921 4.12429 10.2859 3.76792 8.316Z";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => {
  const [isPressed, setIsPressed] = React.useState(false);

  return (
    <CheckboxPrimitive.Root
      ref={ref}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onPointerLeave={() => setIsPressed(false)}
      className={cn(
        "checkbox peer group/checkbox relative inline-flex h-5.5 w-5.5 shrink-0 items-center justify-center p-0 outline-none select-none cursor-pointer",
        "focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <svg
        viewBox="0 0 28 28"
        className="pointer-events-none h-6 w-6 overflow-visible"
        aria-hidden="true"
      >
        <motion.path
          d={isPressed ? SQUISH_BOX : RESTING_BOX}
          transition={{ type: "spring", stiffness: 600, damping: 25 }}
          className={cn(
            "stroke-[1.5px] transition-colors duration-200",
            "group-data-[state=checked]/checkbox:fill-primary group-data-[state=checked]/checkbox:stroke-primary",
            "group-data-[state=unchecked]/checkbox:fill-card group-data-[state=unchecked]/checkbox:stroke-muted-foreground/40 group-hover/checkbox:group-data-[state=unchecked]/checkbox:stroke-primary/50"
          )}
        />
      </svg>
      <CheckboxPrimitive.Indicator className="absolute inset-0 flex items-center justify-center text-primary-foreground pointer-events-none">
        <svg
          viewBox="0 0 12 10"
          className="h-3 w-3 stroke-current fill-none stroke-[2.4] stroke-linecap-round stroke-linejoin-round"
          aria-hidden="true"
        >
          <motion.path
            d="M1.5 5.2L4.2 8.2L10.5 1.8"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          />
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
