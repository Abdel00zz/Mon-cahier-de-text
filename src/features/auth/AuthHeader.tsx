import type { AuthCopy, AuthLocale } from "./authCopy";

/** En-tête partagé : marque + choix de langue, stables entre connexion et préparation. */
export const AuthHeader = ({
  copy,
  displayLocale,
  onLocaleChange,
  onBrandClick,
  isSubmitting,
  onLoginPage,
}: {
  copy: AuthCopy;
  displayLocale: AuthLocale;
  onLocaleChange: (locale: AuthLocale) => void;
  onBrandClick: () => void;
  isSubmitting: boolean;
  onLoginPage: boolean;
}) => (
  <header className="auth-header">
    <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
      {onLoginPage ? (
        <span className="auth-brand">
          <img
            src="/icons/icon-192.png"
            width="36"
            height="36"
            alt=""
            className="object-contain"
          />
          <span className="auth-brand__name">{copy.brand}</span>
        </span>
      ) : (
        /* Nom accessible = texte visible + action : conforme WCAG 2.5.3. */
        <button
          type="button"
          onClick={onBrandClick}
          disabled={isSubmitting}
          title={copy.brandBack}
          aria-label={copy.brandBack}
          className="auth-brand focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <img
            src="/icons/icon-192.png"
            width="36"
            height="36"
            alt=""
            className="object-contain"
          />
          <span className="auth-brand__name">{copy.brand}</span>
        </button>
      )}
    </div>
    <div
      dir="ltr"
      role="group"
      aria-label={copy.languageLabel}
      className="auth-languages"
    >
      {(["ar", "fr"] as const).map((value) => (
        <button
          key={value}
          type="button"
          lang={value}
          disabled={isSubmitting}
          onClick={() => onLocaleChange(value)}
          aria-pressed={displayLocale === value}
          className="auth-choice focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <span>{value === "ar" ? "العربية" : "Français"}</span>
        </button>
      ))}
    </div>
  </header>
);
