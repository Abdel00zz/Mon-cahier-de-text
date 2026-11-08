import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, TriangleAlert } from '@/components/ui/icons';
import { AUTH_COPY, type AuthCopy } from './authCopy';

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
  readOnly,
  invalid,
  errorId,
  copy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  required?: boolean;
  minLength?: number;
  readOnly?: boolean;
  invalid?: boolean;
  errorId?: string;
  copy: AuthCopy;
}) => {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const detectCaps = (event: React.KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(event.getModifierState("CapsLock"));
  const describedBy = [capsLock ? id + "-caps" : null, errorId ?? null]
    .filter(Boolean)
    .join(" ") || undefined;
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
          readOnly={readOnly}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={FIELD_CLASS + " auth-password"}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          // Le focus et le curseur restent dans le champ sur tactile.
          onPointerDown={(event) => event.preventDefault()}
          aria-label={visible ? copy.hidePassword : copy.showPassword}
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
      {/* Région live montée en permanence : seule sa visibilité change. */}
      <p
        id={id + "-caps"}
        role="status"
        hidden={!capsLock}
        className="mt-2 text-xs text-amber-800 dark:text-amber-300"
      >
        <span className="flex items-center gap-2">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          {copy.capsLock}
        </span>
      </p>
    </div>
  );
};
