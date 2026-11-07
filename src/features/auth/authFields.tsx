import { useState, type KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, TriangleAlert } from '@/components/ui/icons';
import { AUTH_COPY, type AuthLocale } from './authCopy';

export const FIELD_CLASS =
  "auth-field placeholder:text-muted-foreground";
export const LABEL_CLASS = "mb-2 block text-sm font-medium";

export const PasswordInput = ({
  id,
  value,
  onChange,
  autoComplete,
  required,
  minLength,
  copy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  required?: boolean;
  minLength?: number;
  copy: (typeof AUTH_COPY)[AuthLocale];
}) => {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const detectCaps = (event: React.KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(event.getModifierState("CapsLock"));
  return (
    <div>
      <div className="relative">
        <Input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={detectCaps}
          onKeyUp={detectCaps}
          onBlur={() => setCapsLock(false)}
          autoComplete={autoComplete}
          enterKeyHint={autoComplete === 'current-password' ? 'go' : 'next'}
          required={required}
          minLength={minLength}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-describedby={capsLock ? id + "-caps" : undefined}
          className={FIELD_CLASS + " auth-password"}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? copy.hidePassword : copy.showPassword}
          aria-pressed={visible}
          aria-controls={id}
          className="auth-password-toggle focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {visible ? (
            <EyeOff className="h-4.5 w-4.5" aria-hidden="true" />
          ) : (
            <Eye className="h-4.5 w-4.5" aria-hidden="true" />
          )}
        </button>
      </div>
      {capsLock && (
        <p
          id={id + "-caps"}
          role="status"
          className="mt-2 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300"
        >
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          {copy.capsLock}
        </p>
      )}
    </div>
  );
};
