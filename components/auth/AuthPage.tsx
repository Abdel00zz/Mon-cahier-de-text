import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, Cycle } from '../../contexts/AuthContext';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
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
    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
    {children}
  </label>
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
      if (password.length < 8) {
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
    <div className="flex min-h-screen items-center justify-center p-4" style={{ backgroundColor: 'var(--clr-bg)' }}>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl font-black text-primary-foreground shadow-lg"
            style={{ fontFamily: "'Roboto Slab', serif" }}
          >
            C
          </div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Roboto Slab', serif" }}>
            Cahier de Textes Interactif
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Votre hub d'enseignant, partout avec vous.</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            {(['login', 'register'] as const).map(value => (
              <button
                key={value}
                type="button"
                onClick={() => switchMode(value)}
                className={`relative rounded-md px-3 py-2.5 text-sm font-semibold transition-colors ${
                  mode === value ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode === value && (
                  <motion.span
                    layoutId="auth-tab"
                    className="absolute inset-0 rounded-md bg-primary shadow"
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
                      className="min-h-11"
                    />
                  </Field>
                  <Field label="Prénom">
                    <Input
                      value={prenom}
                      onChange={e => setPrenom(e.target.value)}
                      autoComplete="given-name"
                      placeholder="Malek"
                      className="min-h-11"
                    />
                  </Field>
                </motion.div>
              )}
            </AnimatePresence>

            <Field label="Téléphone portable">
              <Input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                autoComplete="tel"
                placeholder="06 12 34 56 78"
                required
                className="min-h-11"
              />
            </Field>

            <Field label="Mot de passe">
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
                required
                minLength={mode === 'register' ? 8 : undefined}
                className="min-h-11"
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
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="min-h-11"
                    />
                  </Field>

                  <div className="mt-4 space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                            className={`min-h-11 rounded-xl border text-sm font-semibold transition-colors ${
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
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                            className={`min-h-9 rounded-full border px-3 text-xs font-semibold transition-colors ${
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
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
                role="alert"
              >
                {error}
              </motion.p>
            )}

            <Button type="submit" className="min-h-11 w-full text-base font-semibold" disabled={isSubmitting}>
              {isSubmitting
                ? 'Un instant…'
                : mode === 'login'
                  ? 'Se connecter'
                  : 'Créer mon compte'}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Vos cahiers sont synchronisés en ligne et restent disponibles hors connexion.
        </p>
      </div>
    </div>
  );
};
