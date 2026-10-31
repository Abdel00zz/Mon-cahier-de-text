import React from 'react';
import { Bell } from '@/components/ui/icons';
import { Switch } from '@/components/ui/switch';
import { useLocale } from '@/i18n/LocaleProvider';
import { SettingsRow, settingsFieldClass } from './SettingsPrimitives';

export const Toggle: React.FC<{
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
    hint?: string;
    disabled?: boolean;
    icon?: React.ComponentType<{ className?: string }>;
}> = ({
    checked,
    onChange,
    label,
    hint,
    disabled,
    icon: Icon = Bell,
}) => {
    const id = React.useId();
    const { locale } = useLocale();
    const stateLabel = checked
        ? (locale === 'ar' ? 'مفعّل' : locale === 'en' ? 'On' : 'Activé')
        : (locale === 'ar' ? 'غير مفعّل' : locale === 'en' ? 'Off' : 'Désactivé');
    return (
        <SettingsRow
            label={
                <span className="settings-toggle-row__label">
                    <span className="settings-toggle-row__icon" aria-hidden><Icon className="h-[18px] w-[18px]" /></span>
                    <span className="settings-toggle-row__copy">
                        <span>{label}</span>
                        <span className="settings-toggle-row__state">{stateLabel}</span>
                    </span>
                </span>
            }
            hint={hint}
            htmlFor={id}
            className={`settings-toggle-row ${checked ? 'is-on' : 'is-off'}${disabled ? ' opacity-60' : ''}`}
        >
            <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
        </SettingsRow>
    );
};

/** Liste déroulante alignée à droite d'une ligne de réglage. */
export const SelectRow: React.FC<{
    label: string;
    value: number;
    options: { value: number; label: string }[];
    onChange: (value: number) => void;
    disabled?: boolean;
}> = ({ label, value, options, onChange, disabled }) => {
    const id = React.useId();
    return (
        <SettingsRow label={label} htmlFor={id} className={disabled ? 'opacity-60' : undefined}>
            <select
                id={id}
                value={value}
                disabled={disabled}
                onChange={event => onChange(Number(event.target.value))}
                className={`${settingsFieldClass} w-auto min-w-[6.5rem] cursor-pointer`}
            >
                {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
        </SettingsRow>
    );
};

export const NotificationKind: React.FC<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    detail: string;
}> = ({ icon: Icon, label, detail }) => (
    <div className="flex min-w-0 items-center gap-2.5 rounded-lg bg-muted/60 p-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card text-muted-foreground">
            <Icon className="h-[18px] w-[18px] stroke-[1.5]" />
        </span>
        <span className="min-w-0">
            <span className="block truncate text-xs font-bold text-foreground">{label}</span>
            <span className="block truncate text-[10px] font-medium text-muted-foreground">{detail}</span>
        </span>
    </div>
);

