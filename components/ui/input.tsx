import * as React from "react";
import { cn } from "@/lib/utils";
import { formFieldVariants, type FormFieldVariantProps } from "./form-field";

interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    FormFieldVariantProps {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, size, variant, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(formFieldVariants({ size, variant, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
