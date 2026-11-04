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
      "group cursor-pointer justify-between gap-2 text-start whitespace-normal data-[placeholder]:text-muted-foreground [&>span:first-child]:min-w-0 [&>span:first-child]:break-words [&>span:first-child]:leading-normal",
      "data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-primary/25",
      "transition-colors duration-200 motion-reduce:transition-none",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-data-[state=open]:rotate-180" />
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
    className={cn("flex min-h-11 cursor-default items-center justify-center py-1", className)}
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
    className={cn("flex min-h-11 cursor-default items-center justify-center py-1", className)}
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
          "paper-menu modern-scrollbar relative z-[200] max-h-[var(--radix-select-content-available-height)] max-w-[calc(100vw-1rem)] min-w-[8.5rem] overflow-y-auto overflow-x-hidden rounded-xl border border-border/80 bg-popover p-1.5 text-popover-foreground shadow-[0_12px_30px_-12px_rgba(0,0,0,0.22)] dark:shadow-[0_16px_36px_-12px_rgba(0,0,0,0.55)] text-start motion-reduce:animate-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
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
      "relative flex min-h-11 w-full cursor-pointer select-none items-center rounded-lg py-2 ps-8 pe-3 text-sm leading-normal font-medium outline-none [&>span:last-child]:min-w-0 [&>span:last-child]:break-words",
      "text-popover-foreground hover:bg-primary/10 hover:text-foreground focus:bg-primary/10 focus:text-foreground data-[highlighted]:bg-primary/10 data-[highlighted]:text-foreground dark:hover:bg-primary/20 dark:focus:bg-primary/20 dark:data-[highlighted]:bg-primary/20",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      "transition-colors duration-150 motion-reduce:transition-none",
      className
    )}
    {...props}
  >
    <span className="absolute start-2.5 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-primary stroke-[1.75]" />
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
