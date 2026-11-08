import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EMAIL_PATTERN } from "./authForm";
import { FIELD_CLASS, LABEL_CLASS } from "./authFields";
import type { AuthCopy } from "./authCopy";

/** Réinitialisation : validation e-mail locale, réponse serveur générique (anti-énumération). */
export const ResetForm = ({
  id,
  copy,
  email,
  onEmailChange,
  isSubmitting,
  resetSent,
  error,
  errorRef,
  onSubmit,
  onBackToLogin,
}: {
  id: string;
  copy: AuthCopy;
  email: string;
  onEmailChange: (value: string) => void;
  isSubmitting: boolean;
  resetSent: boolean;
  error: string | null;
  errorRef: React.Ref<HTMLParagraphElement>;
  onSubmit: () => void;
  onBackToLogin: () => void;
}) => {
  const [emailError, setEmailError] = useState<string | null>(null);
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = email.trim();
    if (!value) return setEmailError(copy.requiredField);
    if (!EMAIL_PATTERN.test(value)) return setEmailError(copy.emailInvalid);
    setEmailError(null);
    onSubmit();
  };
  return (
    <form onSubmit={handleSubmit} aria-busy={isSubmitting} noValidate className="mt-6 space-y-4">
      <label htmlFor={id + "-reset-email"} className={LABEL_CLASS}>{copy.email}</label>
      <Input
        id={id + "-reset-email"}
        type="email"
        inputMode="email"
        dir="ltr"
        autoComplete="email"
        value={email}
        onChange={(event) => { onEmailChange(event.target.value); setEmailError(null); }}
        readOnly={isSubmitting}
        aria-invalid={emailError ? true : undefined}
        aria-describedby={emailError ? id + "-reset-email-error" : undefined}
        className={FIELD_CLASS}
      />
      {emailError && (
        <p id={id + "-reset-email-error"} className="auth-field-error">{emailError}</p>
      )}
      {resetSent && <p role="status" className="auth-reset-success">{copy.resetSent}</p>}
      {error && <p ref={errorRef} tabIndex={-1} role="alert" className="auth-error">{error}</p>}
      <Button type="submit" disabled={isSubmitting || resetSent} className="auth-submit">
        {isSubmitting ? copy.wait : copy.resetSubmit}
      </Button>
      <button type="button" disabled={isSubmitting} className="auth-link" onClick={onBackToLogin}>
        {copy.backToLogin}
      </button>
    </form>
  );
};
