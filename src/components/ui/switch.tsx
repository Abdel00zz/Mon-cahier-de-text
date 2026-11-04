import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  activeBaseColor?: string;
  inactiveBaseColor?: string;
}

/** Radix owns keyboard, form and checked state; CSS animates only the thumb transform. */
const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitives.Root>, SwitchProps>(
  ({ className, activeBaseColor, inactiveBaseColor, onCheckedChange, ...props }, ref) => {
    const { impact } = useHapticFeedback();
    return <SwitchPrimitives.Root {...props} ref={ref}
      className={cn('ui-switch', className)}
      onCheckedChange={checked => { impact('light'); onCheckedChange?.(checked); }}>
      <span className="ui-switch__track" aria-hidden="true" style={{
        '--ui-switch-active': activeBaseColor,
        '--ui-switch-inactive': inactiveBaseColor,
      } as React.CSSProperties}>
        <SwitchPrimitives.Thumb className="ui-switch__thumb" />
      </span>
    </SwitchPrimitives.Root>;
  },
);
Switch.displayName = 'Switch';
export { Switch };
