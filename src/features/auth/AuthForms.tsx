import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CircleCheck, Loader2 } from "@/components/ui/icons";
import { FIELD_CLASS, LABEL_CLASS, PasswordInput } from "./authFields";
import { passwordScore } from "./authForm";
import type { AuthCopy } from "./authCopy";

export type AuthFieldName =
  | "nom"
  | "prenom"
  | "email"
  | "phone"
  | "password"
  | "confirm";

export interface AuthFieldValues {
  nom: string;
  prenom: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

/** Identifiants DOM des champs, pour le focus du premier invalid. */
export const AUTH_FIELD_IDS: Record<AuthFieldName, string> = {
  nom: "name",
  prenom: "first-name",
  email: "email",
  phone: "phone",
  password: "password",
  confirm: "confirm",
};

const FieldError = ({ id, message }: { id: string; message?: string }) =>
  message ? <p id={id} className="auth-field-error">{message}</p> : null;

const StrengthMeter = ({ score, copy }: { score: number; copy: AuthCopy }) => (
  <div
    className="mt-3"
    role="meter"
    aria-label={copy.strengthLabel}
    aria-valuemin={0}
    aria-valuemax={4}
    aria-valuenow={score}
    aria-valuetext={score ? copy.strength[score - 1] : copy.passwordMin}
  >
    <div className="flex gap-1.5" aria-hidden="true">
      {[1, 2, 3, 4].map((level) => (
        <span
          key={level}
          className={
            "h-1 flex-1 rounded-full transition-colors motion-reduce:transition-none " +
            (level > score
              ? "bg-stone-200 dark:bg-stone-700"
              : score === 1
                ? "bg-red-600"
                : score === 2
                  ? "bg-amber-600"
                  : "bg-emerald-600")
          }
        />
      ))}
    </div>
    <p className="mt-2 text-xs text-stone-600 dark:text-stone-400">
      {score ? copy.strengthLabel + " : " + copy.strength[score - 1] : copy.passwordMin}
    </p>
  </div>
);

/** Formulaire commun connexion / inscription. La validation bloquante est
 * maison (noValidate) : messages bilingues, aria-invalid et focus ciblé,
 * sans bulle native dans la langue du navigateur. Pendant l'envoi, les
 * champs passent en readOnly (focus et clavier préservés) au lieu d'un
 * fieldset disabled qui clignote. */
export const AuthMainForm = ({
  id,
  isRegister,
  copy,
  notice,
  error,
  errorRef,
  isSubmitting,
  loginMethod,
  phoneValid,
  values,
  fieldErrors,
  onFieldChange,
  onSubmit,
  onForgot,
}: {
  id: string;
  isRegister: boolean;
  copy: AuthCopy;
  notice: "blocked" | null;
  error: string | null;
  errorRef: React.Ref<HTMLParagraphElement>;
  isSubmitting: boolean;
  loginMethod: "email" | "phone";
  phoneValid: boolean;
  values: AuthFieldValues;
  fieldErrors: Partial<Record<AuthFieldName, string>>;
  onFieldChange: (name: AuthFieldName, value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onForgot: () => void;
}) => {
  const score = passwordScore(values.password);
  const passwordsMatch =
    values.confirmPassword.length > 0 &&
    values.password === values.confirmPassword;
  const phoneDescribedBy = [
    fieldErrors.phone ? id + "-err-phone" : null,
    phoneValid ? id + "-phone-valid" : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;
  return (
    <form
      key={isRegister ? "register" : "login"}
      className="auth-reveal"
      id={id + "-form"}
      onSubmit={onSubmit}
      aria-labelledby={id + "-title"}
      aria-busy={isSubmitting}
      noValidate
    >
      <fieldset data-busy={isSubmitting || undefined} className="min-w-0 space-y-4">
        {notice === "blocked" && (
          <p
            role="status"
            className="rounded-[8px] border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
          >
            {copy.accountBlocked}
          </p>
        )}
        {isRegister && (
          <div className="grid grid-cols-1 gap-4 min-[390px]:grid-cols-2">
            <div>
              <label htmlFor={id + "-name"} className={LABEL_CLASS}>
                {copy.name}
              </label>
              <Input
                id={id + "-name"}
                name="family-name"
                value={values.nom}
                onChange={(event) => onFieldChange("nom", event.target.value)}
                autoComplete="family-name"
                required
                readOnly={isSubmitting}
                aria-invalid={fieldErrors.nom ? true : undefined}
                aria-describedby={fieldErrors.nom ? id + "-err-nom" : undefined}
                className={FIELD_CLASS}
              />
              <FieldError id={id + "-err-nom"} message={fieldErrors.nom} />
            </div>
            <div>
              <label htmlFor={id + "-first-name"} className={LABEL_CLASS}>
                {copy.firstName}
              </label>
              <Input
                id={id + "-first-name"}
                name="given-name"
                value={values.prenom}
                onChange={(event) => onFieldChange("prenom", event.target.value)}
                autoComplete="given-name"
                required
                readOnly={isSubmitting}
                aria-invalid={fieldErrors.prenom ? true : undefined}
                aria-describedby={fieldErrors.prenom ? id + "-err-prenom" : undefined}
                className={FIELD_CLASS}
              />
              <FieldError id={id + "-err-prenom"} message={fieldErrors.prenom} />
            </div>
          </div>
        )}
        {(isRegister || loginMethod === "email") && (
          <div>
            <label htmlFor={id + "-email"} className={LABEL_CLASS}>{copy.email}</label>
            <Input
              id={id + "-email"}
              name="email"
              type="email"
              inputMode="email"
              enterKeyHint="next"
              dir="ltr"
              value={values.email}
              onChange={(event) => onFieldChange("email", event.target.value)}
              autoComplete={isRegister ? "email" : "username"}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              maxLength={254}
              placeholder="vous@exemple.com"
              readOnly={isSubmitting}
              aria-invalid={fieldErrors.email ? true : undefined}
              aria-describedby={fieldErrors.email ? id + "-err-email" : undefined}
              className={FIELD_CLASS}
            />
            <FieldError id={id + "-err-email"} message={fieldErrors.email} />
          </div>
        )}
        {!isRegister && loginMethod === "phone" && (
          <div>
            <label htmlFor={id + "-phone"} className={LABEL_CLASS}>
              {copy.phone}
            </label>
            <div className="relative" dir="ltr">
              <Input
                id={id + "-phone"}
                name="phone"
                type="tel"
                inputMode="tel"
                enterKeyHint="next"
                dir="ltr"
                value={values.phone}
                onChange={(event) => onFieldChange("phone", event.target.value)}
                autoComplete="tel"
                placeholder="06 12 34 56 78"
                required
                aria-invalid={fieldErrors.phone ? true : undefined}
                aria-describedby={phoneDescribedBy}
                readOnly={isSubmitting}
                className={FIELD_CLASS + " auth-phone text-left tabular-nums"}
              />
              {/* Région live permanente : le contenu change, le conteneur reste monté. */}
              <span
                id={id + "-phone-valid"}
                role="status"
                className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-emerald-700 dark:text-emerald-300"
              >
                {phoneValid && (
                  <>
                    <CircleCheck className="h-5 w-5" aria-hidden="true" />
                    <span className="sr-only">{copy.phoneComplete}</span>
                  </>
                )}
              </span>
            </div>
            <FieldError id={id + "-err-phone"} message={fieldErrors.phone} />
          </div>
        )}
        <div>
          <label htmlFor={id + "-password"} className={LABEL_CLASS}>
            {copy.password}
          </label>
          <PasswordInput
            id={id + "-password"}
            value={values.password}
            onChange={(value) => onFieldChange("password", value)}
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
            minLength={isRegister ? 8 : undefined}
            readOnly={isSubmitting}
            invalid={Boolean(fieldErrors.password)}
            errorId={fieldErrors.password ? id + "-err-password" : undefined}
            copy={copy}
          />
          {isRegister && <StrengthMeter score={score} copy={copy} />}
          <FieldError id={id + "-err-password"} message={fieldErrors.password} />
        </div>
        {isRegister && (
          <div>
            <label htmlFor={id + "-confirm"} className={LABEL_CLASS}>
              {copy.confirmPassword}
            </label>
            <PasswordInput
              id={id + "-confirm"}
              value={values.confirmPassword}
              onChange={(value) => onFieldChange("confirm", value)}
              autoComplete="new-password"
              required
              readOnly={isSubmitting}
              invalid={Boolean(fieldErrors.confirm)}
              errorId={fieldErrors.confirm ? id + "-err-confirm" : undefined}
              copy={copy}
            />
            {/* Région live permanente : la visibilité change, pas le montage. */}
            <p
              role="status"
              hidden={!passwordsMatch}
              className="mt-2 text-xs text-emerald-700 dark:text-emerald-300"
            >
              <span className="flex items-center gap-1.5">
                <CircleCheck className="h-4 w-4" aria-hidden="true" />
                {copy.samePassword}
              </span>
            </p>
            <FieldError id={id + "-err-confirm"} message={fieldErrors.confirm} />
          </div>
        )}
        {isRegister && (
          <details className="auth-optional">
            <summary>{copy.contactOptional}</summary>
            <label htmlFor={id + "-contact"} className={LABEL_CLASS}>{copy.phoneOptional}</label>
            <Input
              id={id + "-contact"}
              name="tel"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              value={values.phone}
              onChange={(event) => onFieldChange("phone", event.target.value)}
              readOnly={isSubmitting}
              className={FIELD_CLASS}
              placeholder="06 12 34 56 78"
            />
            <p>{copy.contactHelp}</p>
          </details>
        )}
        {!isRegister && loginMethod === "email" && (
          <button type="button" className="auth-link auth-forgot" onClick={onForgot}>
            {copy.forgotPassword}
          </button>
        )}
        {error && (
          <p
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="rounded-[8px] border border-red-200 bg-red-50 p-3 text-sm text-red-800 focus-visible:outline-2 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          >
            {error}
          </p>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="auth-submit auth-action disabled:cursor-wait"
        >
          {isSubmitting && (
            <Loader2
              className="h-4 w-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          )}
          {isSubmitting ? copy.wait : isRegister ? copy.createMyAccount : copy.login}
        </Button>
      </fieldset>
    </form>
  );
};
