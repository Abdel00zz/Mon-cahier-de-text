import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { useLocale } from "@/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { formFieldVariants, type FormFieldVariantProps } from "./form-field";

const Select = ({ dir, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root>) => {
  const { isRtl } = useLocale();
  return <SelectPrimitive.Root dir={dir ?? (isRtl ? 'rtl' : 'ltr')} {...props} />;
};
const SelectValue = SelectPrimitive.Value;

interface SelectTriggerProps
  extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>,
    FormFieldVariantProps {}

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(({ className, children, size, variant, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      formFieldVariants({ size, variant }),
      "cursor-pointer justify-between data-[placeholder]:text-muted-foreground [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground/70" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", dir, ...props }, ref) => {
  const { isRtl } = useLocale();
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        dir={dir ?? (isRtl ? 'rtl' : 'ltr')}
        className={cn(
          "paper-menu modern-scrollbar relative z-[200] max-h-[var(--radix-select-content-available-height)] max-w-[calc(100vw-1rem)] min-w-[8.5rem] overflow-y-auto overflow-x-hidden rounded-2xl border border-border/80 dark:border-white/10 bg-popover/95 dark:bg-popover/90 p-1.5 text-popover-foreground shadow-[0_16px_36px_-12px_rgba(0,0,0,0.18),0_4px_12px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_24px_50px_-16px_rgba(0,0,0,0.65)] backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 text-start motion-reduce:animate-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-150 ease-out",
          "origin-[--radix-select-content-transform-origin]",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1.5 data-[side=left]:-translate-x-1.5 data-[side=right]:translate-x-1.5 data-[side=top]:-translate-y-1.5",
          className
        )}
        position={position}
        collisionPadding={8}
        sideOffset={6}
        {...props}
      >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "w-full min-w-[min(var(--radix-select-trigger-width),calc(100vw-2rem))]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
});
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex min-h-11 w-full cursor-pointer select-none items-center rounded-xl py-2 ps-8 pe-3 text-[13px] font-medium outline-none",
      "text-popover-foreground hover:bg-muted/70 hover:text-foreground focus:bg-muted/80 focus:text-foreground",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      "transition-colors duration-150 motion-reduce:transition-none",
      className
    )}
    {...props}
  >
    <span className="absolute start-2.5 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-primary stroke-[2.5]" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

export {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
};
