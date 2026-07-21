import * as React from 'react';
import { cn } from '@/lib/utils';
import { formatDate, parseFrenchDateToISO } from '@/utils/formatDate';

interface DateFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
    value?: string;
    onChange: (iso: string) => void;
}

export const DateField = React.forwardRef<HTMLInputElement, DateFieldProps>(({ value = '', onChange, className, onFocus, onBlur, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(value ? formatDate(value) : '');

    React.useEffect(() => {
        setDisplayValue(value ? formatDate(value) : '');
    }, [value]);

    return (
        <input
            {...props}
            ref={ref}
            type="text"
            inputMode="numeric"
            placeholder="jj/mm/aaaa"
            value={displayValue}
            onChange={event => setDisplayValue(event.target.value)}
            onFocus={event => {
                event.currentTarget.scrollIntoView({ block: 'center', behavior: 'smooth' });
                onFocus?.(event);
            }}
            onBlur={event => {
                const iso = parseFrenchDateToISO(event.target.value);
                if (iso !== null) onChange(iso);
                else setDisplayValue(value ? formatDate(value) : '');
                onBlur?.(event);
            }}
            className={cn('h-11 rounded-lg border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40', className)}
        />
    );
});
DateField.displayName = 'DateField';
