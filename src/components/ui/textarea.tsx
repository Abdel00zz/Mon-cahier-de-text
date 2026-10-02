import * as React from "react";
import { cn } from "@/lib/utils";
import { formFieldVariants, type FormFieldVariantProps } from "./form-field";

interface TextareaProps
  extends Omit<React.ComponentProps<"textarea">, "size">,
    FormFieldVariantProps {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, size, variant, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          formFieldVariants({ size, variant }),
          "min-h-[90px] py-3",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
