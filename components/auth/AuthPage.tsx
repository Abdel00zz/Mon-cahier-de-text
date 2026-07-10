import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, Cycle } from '../../contexts/AuthContext';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { BookOpen, CircleCheck, Eye, EyeOff, Loader2, TriangleAlert } from '../ui/icons';
import { SUBJECTS } from '../../constants';

type Mode = 'login' | 'register';

const CYCLES: { value: Cycle; label: string }[] = [
  { value: 'college', label: 'Collège' },
  { value: 'lycee', label: 'Lycée' },
  { value: 'prepa', label: 'Prépa' },
];

/** Force du mot de passe — indicative (le serveur n'exige que 8 caractères). */
const passwordStrength = (pw: string): { score: number; label: string; barClass: string; textClass: string } => {
  if (!pw) return { score: 0, label: '', barClass: '', textClass: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const level = Math.min(score, 4);
  const map = [
    { label: 'Très faible', barClass: 'bg-destructive', textClass: 'text-destructive' },
    { label: 'Faible', barClass: 'bg-destructive', textClass: 'text-destructive' },
    { label: 'Moyen', barClass: 'bg-warning', textClass: 'text-warning' },
    { label: 'Bon', barClass: 'bg-success', textClass: 'text-success' },
    { label: 'Excellent', barClass: 'bg-success', textClass: 'text-success' },
  ];
  return { score: level, ...map[level] };
};

/** Formatage téléphone marocain : « 06 12 34 56 78 » (le backend ne garde que les chiffres). */
const formatMoroccanPhone = (raw: string): string =>
  raw.replace(/[^\d]/g, '').slice(0, 10).replace(/(\d{2})(?=\d)/g, '$1 ').trim();

/** Libellé compact au-dessus d'un champ. */
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-wide text-muted-foreground">{children}</span>
);

/** Champ mot de passe : bascule de visibilité + alerte Verr. Maj (cible ≥44px). */
const PasswordInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  placeholder?: string;
  minLength?: number;
  required?: boolean;
}> = ({ value, onChange, autoComplete, placeholder = '••••••••', minLength, required }) => {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const detectCaps = (e: React.KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState?.('CapsLock') ?? false);

  return (
    <div>
      <div className="relative">
        <Input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyUp={detectCaps}
          onKeyDown={detectCaps}
          onBlur={() => setCapsLock(false)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          className="h-11 rounded-xl pr-11"
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
      {capsLock && (
        <p className="mt-1 flex items-center gap-1 text-[10.5px] font-semibold text-warning animate-fade-in">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0" /> Verrouillage majuscules activé
        </p>
      )}
    </div>
  );
};

const LiveCheck: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
  <span className={`inline-flex items-center gap-1 text-[10.5px] font-semibold transition-colors ${ok ? 'text-success' : 'text-muted-foreground/50'}`}>
    <CircleCheck className={`h-3.5 w-3.5 ${ok ? '' : 'opacity-40'}`} /> {label}
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
  const strength = passwordStrength(password);
  const isRegister = mode === 'register';

  const toggleCycle = (v: Cycle) => setCycles(p => (p.includes(v) ? p.filter(c => c !== v) : [...p, v]));
  const toggleSubject = (v: string) => setSubjects(p => (p.includes(v) ? p.filter(s => s !== v) : [...p, v]));
  const switchMode = (next: Mode) => { setMode(next); setError(null); };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (isRegister) {
      if (!nom.trim() || !prenom.trim()) return setError('Veuillez renseigner votre nom et votre prénom.');
      if (!passwordLongEnough) return setError('Le mot de passe doit contenir au moins 8 caractères.');
      if (password !== confirmPassword) return setError('Les deux mots de passe ne correspondent pas.');
      if (cycles.length === 0) return setError('Veuillez choisir au moins un cycle d’enseignement.');
      if (subjects.length === 0) return setError('Veuillez choisir au moins une matière.');
    }
    setIsSubmitting(true);
    try {
      if (mode === 'login') await login(phone, password);
      else await register({ nom: nom.trim(), prenom: prenom.trim(), phone, password, cycles, subjects });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // min-h-dvh + justify-center : centré si ça tient, DÉFILABLE si c'est plus
    // haut que l'écran (fini les coupures haut/bas). overflow-x-hidden empêche
    // tout débordement latéral. Aucun halo décoratif (le fond du body suffit).
    <div className="flex min-h-dvh w-full flex-col justify-center overflow-x-hidden px-4 py-5 safe-bottom">
      <div className="mx-auto w-full max-w-sm">
        {/* En-tête compact */}
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-extrabold leading-tight text-foreground">Cahier de Textes</h1>
            <p className="truncate text-[11px] font-medium text-muted-foreground">Votre hub d'enseignant, partout.</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-border/60 bg-card/95 p-4 shadow-lg backdrop-blur-sm sm:p-5"
        >
          {/* Onglets */}
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            {(['login', 'register'] as const).map(value => (
              <button
                key={value}
                type="button"
                onClick={() => switchMode(value)}
                className={`relative min-h-9 rounded-lg px-3 text-sm font-bold transition-colors ${mode === value ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {mode === value && (
                  <motion.span layoutId="auth-tab" className="absolute inset-0 rounded-lg bg-primary shadow" transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />
                )}
                <span className="relative">{value === 'login' ? 'Connexion' : 'Créer un compte'}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Nom + Prénom (inscription) */}
            <AnimatePresence initial={false}>
              {isRegister && (
                <motion.div
                  key="names"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-2 gap-3 overflow-hidden"
                >
                  <label className="block">
                    <Label>Nom</Label>
                    <Input value={nom} onChange={e => setNom(e.target.value)} autoComplete="family-name" placeholder="Benali" className="h-11 rounded-xl" />
                  </label>
                  <label className="block">
                    <Label>Prénom</Label>
                    <Input value={prenom} onChange={e => setPrenom(e.target.value)} autoComplete="given-name" placeholder="Malek" className="h-11 rounded-xl" />
                  </label>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Téléphone */}
            <label className="block">
              <Label>Téléphone portable</Label>
              <div className="relative">
                <Input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={e => setPhone(formatMoroccanPhone(e.target.value))}
                  autoComplete="tel"
                  placeholder="06 12 34 56 78"
                  required
                  className="h-11 rounded-xl pr-10"
                />
                {phoneValid && <CircleCheck className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-success animate-fade-in" />}
              </div>
            </label>

            {/* Mot de passe */}
            <label className="block">
              <Label>Mot de passe</Label>
              <PasswordInput value={password} onChange={setPassword} autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength={isRegister ? 8 : undefined} />
            </label>

            {/* Confirmation + jauge + cycles + matières (inscription) */}
            <AnimatePresence initial={false}>
              {isRegister && (
                <motion.div
                  key="register-extra"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3 overflow-hidden"
                >
                  <label className="block">
                    <Label>Confirmer le mot de passe</Label>
                    <PasswordInput value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
                  </label>

                  {/* Jauge de force + validations, sur une ligne compacte */}
                  {password.length > 0 && (
                    <div className="flex items-center gap-2 animate-fade-in">
                      <div className="flex flex-1 gap-1" aria-hidden>
                        {[0, 1, 2, 3].map(i => (
                          <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i < strength.score ? strength.barClass : 'bg-muted'}`} />
                        ))}
                      </div>
                      <span className={`shrink-0 text-[10.5px] font-bold ${strength.textClass}`}>{strength.label}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    <LiveCheck ok={passwordLongEnough} label="8 car. min." />
                    <LiveCheck ok={passwordsMatch} label="Identiques" />
                  </div>

                  {/* Cycles */}
                  <div>
                    <Label>Cycle(s)</Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {CYCLES.map(cycle => {
                        const active = cycles.includes(cycle.value);
                        return (
                          <button
                            key={cycle.value}
                            type="button"
                            onClick={() => toggleCycle(cycle.value)}
                            aria-pressed={active}
                            className={`min-h-10 rounded-lg border text-[13px] font-bold transition-all active:scale-95 ${active ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-border bg-background text-muted-foreground hover:border-primary/40'}`}
                          >
                            {cycle.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Matières — chips compactes */}
                  <div>
                    <span className="mb-1 flex items-center gap-1.5">
                      <Label>Matière(s)</Label>
                      {subjects.length > 0 && (
                        <span className="mb-1 rounded-full bg-primary/15 px-1.5 text-[10px] font-black tabular-nums text-primary">{subjects.length}</span>
                      )}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {SUBJECTS.map(s => {
                        const active = subjects.includes(s);
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => toggleSubject(s)}
                            aria-pressed={active}
                            className={`min-h-8 rounded-full border px-2.5 text-[11px] font-bold transition-all active:scale-95 ${active ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-border bg-background text-muted-foreground hover:border-primary/40'}`}
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
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] font-semibold text-destructive animate-fade-in" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" disabled={isSubmitting} className="h-11 w-full rounded-xl text-[15px] font-bold shadow-md shadow-primary/20 transition-transform active:scale-[0.98]">
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Un instant…</>
              ) : isRegister ? 'Créer mon compte' : 'Se connecter'}
            </Button>
          </form>
        </motion.div>

        <p className="mt-4 text-center text-[11px] font-medium text-muted-foreground">
          Synchronisé en ligne, disponible hors connexion.
        </p>
      </div>
    </div>
  );
};
