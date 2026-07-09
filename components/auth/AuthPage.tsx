import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, Cycle } from '../../contexts/AuthContext';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { BookOpen, CircleCheck, Eye, EyeOff, Loader2 } from '../ui/icons';
import { SUBJECTS } from '../../constants';

type Mode = 'login' | 'register';

const CYCLES: { value: Cycle; label: string }[] = [
  { value: 'college', label: 'Collège' },
  { value: 'lycee', label: 'Lycée' },
  { value: 'prepa', label: 'Prépa' },
];

const Field: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <label className="block space-y-1.5">
    <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">{label}</span>
    {children}
  </label>
);

/** Champ mot de passe avec bascule de visibilité — indispensable au pouce. */
const PasswordInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  placeholder?: string;
  minLength?: number;
  required?: boolean;
}> = ({ value, onChange, autoComplete, placeholder = '••••••••', minLength, required }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className="min-h-11 rounded-xl pr-11"
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted-foreground/60 transition-colors hover:text-foreground"
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        tabIndex={-1}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
};

/** Critère de validation en direct (inscription) : coche verte quand satisfait. */
const LiveCheck: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold transition-colors ${ok ? 'text-success' : 'text-muted-foreground/60'}`}>
    <CircleCheck className={`h-3.5 w-3.5 transition-transform ${ok ? 'scale-100' : 'scale-90 opacity-40'}`} />
    {label}
  </span>
);

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cycles, setCycles] = useState<Cycle[]>(['college']);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordLongEnough = password.length >= 8;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const phoneValid = phone.replace(/[^\d]/g, '').length >= 8;

  const toggleCycle = (value: Cycle) => {
    setCycles(prev => (prev.includes(value) ? prev.filter(c => c !== value) : [...prev, value]));
  };

  const toggleSubject = (value: string) => {
    setSubjects(prev => (prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]));
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (mode === 'register') {
      if (!nom.trim() || !prenom.trim()) {
        setError('Veuillez renseigner votre nom et votre prénom.');
        return;
      }
      if (!passwordLongEnough) {
        setError('Le mot de passe doit contenir au moins 8 caractères.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Les deux mots de passe ne correspondent pas.');
        return;
      }
      if (cycles.length === 0) {
        setError('Veuillez choisir au moins un cycle d’enseignement.');
        return;
      }
      if (subjects.length === 0) {
        setError('Veuillez choisir au moins une matière.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(phone, password);
      } else {
        await register({ nom: nom.trim(), prenom: prenom.trim(), phone, password, cycles, subjects });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 safe-bottom">
      {/* Décor vivant — halos aux couleurs du design system */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-[90px]" aria-hidden />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-success/10 blur-[100px]" aria-hidden />

      <div className="relative w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-6 text-center sm:mb-8"
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <BookOpen className="h-7 w-7" />
          </div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
            Cahier de Textes Interactif
          </h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">Votre hub d'enseignant, partout avec vous.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="rounded-[24px] border border-border/60 bg-card/90 p-5 shadow-xl backdrop-blur-sm sm:p-8"
        >
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            {(['login', 'register'] as const).map(value => (
              <button
                key={value}
                type="button"
                onClick={() => switchMode(value)}
                className={`relative min-h-10 rounded-lg px-3 text-sm font-bold transition-colors ${
                  mode === value ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode === value && (
                  <motion.span
                    layoutId="auth-tab"
                    className="absolute inset-0 rounded-lg bg-primary shadow"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative">{value === 'login' ? 'Connexion' : 'Créer un compte'}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="popLayout" initial={false}>
              {mode === 'register' && (
                <motion.div
                  key="register-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 gap-4 overflow-hidden sm:grid-cols-2"
                >
                  <Field label="Nom">
                    <Input
                      value={nom}
                      onChange={e => setNom(e.target.value)}
                      autoComplete="family-name"
                      placeholder="Benali"
                      className="min-h-11 rounded-xl"
                    />
                  </Field>
                  <Field label="Prénom">
                    <Input
                      value={prenom}
                      onChange={e => setPrenom(e.target.value)}
                      autoComplete="given-name"
                      placeholder="Malek"
                      className="min-h-11 rounded-xl"
                    />
                  </Field>
                </motion.div>
              )}
            </AnimatePresence>

            <Field label="Téléphone portable">
              <div className="relative">
                <Input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  autoComplete="tel"
                  placeholder="06 12 34 56 78"
                  required
                  autoFocus
                  className="min-h-11 rounded-xl pr-10"
                />
                {phoneValid && (
                  <CircleCheck className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-success animate-fade-in" />
                )}
              </div>
            </Field>

            <Field label="Mot de passe">
              <PasswordInput
                value={password}
                onChange={setPassword}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={mode === 'register' ? 8 : undefined}
              />
            </Field>

            <AnimatePresence mode="popLayout" initial={false}>
              {mode === 'register' && (
                <motion.div
                  key="confirm-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <Field label="Confirmer le mot de passe">
                    <PasswordInput
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      autoComplete="new-password"
                    />
                  </Field>

                  {/* Validation en direct : l'enseignant voit ce qui manque avant d'envoyer */}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    <LiveCheck ok={passwordLongEnough} label="8 caractères min." />
                    <LiveCheck ok={passwordsMatch} label="Mots de passe identiques" />
                  </div>

                  <div className="mt-4 space-y-1.5">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      Cycle(s) d'enseignement
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {CYCLES.map(cycle => {
                        const active = cycles.includes(cycle.value);
                        return (
                          <button
                            key={cycle.value}
                            type="button"
                            onClick={() => toggleCycle(cycle.value)}
                            className={`min-h-11 rounded-xl border text-sm font-bold transition-all active:scale-95 ${
                              active
                                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                            }`}
                            aria-pressed={active}
                          >
                            {cycle.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      Matière(s) enseignée(s)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {SUBJECTS.map(s => {
                        const active = subjects.includes(s);
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => toggleSubject(s)}
                            className={`min-h-9 rounded-full border px-3 text-xs font-bold transition-all active:scale-95 ${
                              active
                                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                            }`}
                            aria-pressed={active}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive"
                role="alert"
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              className="min-h-12 w-full rounded-xl text-base font-bold shadow-md shadow-primary/20 transition-transform active:scale-[0.98]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Un instant…
                </>
              ) : mode === 'login' ? (
                'Se connecter'
              ) : (
                'Créer mon compte'
              )}
            </Button>
          </form>
        </motion.div>

        <p className="mt-6 text-center text-xs font-medium text-muted-foreground">
          Vos cahiers sont synchronisés en ligne et restent disponibles hors connexion.
        </p>
      </div>
    </div>
  );
};
