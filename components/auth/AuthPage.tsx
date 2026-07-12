import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, Cycle } from '../../contexts/AuthContext';
import { Input } from '../ui/input';
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
    { label: 'Très faible', barClass: 'bg-red-500', textClass: 'text-red-500' },
    { label: 'Faible', barClass: 'bg-red-500', textClass: 'text-red-500' },
    { label: 'Moyen', barClass: 'bg-amber-500', textClass: 'text-amber-500' },
    { label: 'Bon', barClass: 'bg-success', textClass: 'text-success' },
    { label: 'Excellent', barClass: 'bg-success', textClass: 'text-success' },
  ];
  return { score: level, ...map[level] };
};

/** Formatage téléphone marocain : « 06 12 34 56 78 » (le backend ne garde que les chiffres). */
const formatMoroccanPhone = (raw: string): string =>
  raw.replace(/[^\d]/g, '').slice(0, 10).replace(/(\d{2})(?=\d)/g, '$1 ').trim();

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
          className="h-10 rounded-lg border border-slate-200 bg-white hover:border-slate-300 focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/20 text-slate-800 font-semibold pr-10 text-xs transition-colors"
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          tabIndex={-1}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {capsLock && (
        <p className="mt-1 flex items-center gap-1 text-[10.5px] font-semibold text-amber-600 animate-fade-in">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" /> Verrouillage majuscules activé
        </p>
      )}
    </div>
  );
};

const LiveCheck: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
  <span className={`inline-flex items-center gap-1 text-[10.5px] font-bold transition-colors ${ok ? 'text-success' : 'text-slate-400/60'}`}>
    <CircleCheck className={`h-3.5 w-3.5 ${ok ? 'text-success' : 'text-slate-300'}`} /> {label}
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
    <div className="flex min-h-dvh w-full flex-col justify-center overflow-x-hidden px-4 py-8 safe-bottom bg-slate-50 relative">
      {/* Subtle modern dot-grid texture */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.035)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none z-0" />

      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-gradient-to-br from-primary/5 to-transparent blur-3xl opacity-60 z-0 pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-gradient-to-tr from-indigo-100/20 to-transparent blur-3xl opacity-60 z-0 pointer-events-none" />

      <div className="mx-auto w-full max-w-sm relative z-10">
        {/* Header */}
        <div className="mb-6 flex flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 mb-3.5 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200/80 text-primary shadow-sm transform transition-all duration-300 hover:scale-105">
            <BookOpen className="h-5.5 w-5.5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-extrabold leading-tight text-slate-800 tracking-tight">Cahier de Textes</h1>
            <p className="mt-1 text-xs font-semibold text-slate-400">Votre cahier de textes interactif, n'importe où.</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-100/50 sm:p-8"
        >
          {/* Segment/Tab Control */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200/40">
            {(['login', 'register'] as const).map(value => (
              <button
                key={value}
                type="button"
                onClick={() => switchMode(value)}
                className={`relative py-2 text-xs font-bold transition-colors rounded-lg cursor-pointer focus:outline-none ${mode === value ? 'text-slate-900 font-extrabold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {mode === value && (
                  <motion.span
                    layoutId="auth-tab"
                    className="absolute inset-0 rounded-lg bg-white border border-slate-200/50 shadow-sm"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">{value === 'login' ? 'Connexion' : 'Créer un compte'}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nom</span>
                    <Input
                      value={nom}
                      onChange={e => setNom(e.target.value)}
                      autoComplete="family-name"
                      placeholder="Benali"
                      className="h-10 rounded-lg border border-slate-200 bg-white hover:border-slate-300 focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/20 text-slate-800 font-semibold text-xs transition-colors"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Prénom</span>
                    <Input
                      value={prenom}
                      onChange={e => setPrenom(e.target.value)}
                      autoComplete="given-name"
                      placeholder="Malek"
                      className="h-10 rounded-lg border border-slate-200 bg-white hover:border-slate-300 focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/20 text-slate-800 font-semibold text-xs transition-colors"
                    />
                  </label>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Téléphone */}
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Téléphone portable</span>
              <div className="relative">
                <Input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={e => setPhone(formatMoroccanPhone(e.target.value))}
                  autoComplete="tel"
                  placeholder="06 12 34 56 78"
                  required
                  className="h-10 rounded-lg border border-slate-200 bg-white hover:border-slate-300 focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/20 text-slate-800 font-semibold text-xs transition-colors pr-10"
                />
                {phoneValid && <CircleCheck className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-success animate-fade-in" />}
              </div>
            </label>

            {/* Mot de passe */}
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Mot de passe</span>
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
                  className="space-y-4 overflow-hidden"
                >
                  <label className="block">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Confirmer le mot de passe</span>
                    <PasswordInput value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
                  </label>

                  {/* Jauge de force */}
                  {password.length > 0 && (
                    <div className="flex items-center gap-2 animate-fade-in bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <div className="flex flex-1 gap-1" aria-hidden>
                        {[0, 1, 2, 3].map(i => (
                          <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < strength.score ? strength.barClass : 'bg-slate-200'}`} />
                        ))}
                      </div>
                      <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider ${strength.textClass}`}>{strength.label}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                    <LiveCheck ok={passwordLongEnough} label="8 car. min." />
                    <LiveCheck ok={passwordsMatch} label="Identiques" />
                  </div>

                  {/* Cycles */}
                  <div className="pt-1.5">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Cycle(s) enseigné(s)</span>
                    <div className="grid grid-cols-3 gap-2">
                      {CYCLES.map(cycle => {
                        const active = cycles.includes(cycle.value);
                        return (
                          <button
                            key={cycle.value}
                            type="button"
                            onClick={() => toggleCycle(cycle.value)}
                            aria-pressed={active}
                            className={`min-h-9 rounded-lg border text-[11px] font-bold transition-all active:scale-95 cursor-pointer ${
                              active
                                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {cycle.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Matières */}
                  <div className="pt-1.5">
                    <span className="mb-2 flex items-center gap-1.5">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Matière(s) enseignée(s)</span>
                      {subjects.length > 0 && (
                        <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-extrabold tabular-nums text-primary">{subjects.length}</span>
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
                            className={`min-h-7.5 rounded-full border px-3 text-[11px] font-bold transition-all active:scale-95 cursor-pointer ${
                              active
                                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                            }`}
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
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[12px] font-semibold text-red-600 animate-fade-in" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full h-10 mt-4 flex items-center justify-center gap-2 rounded-lg bg-primary text-white text-xs sm:text-sm font-bold transition-all hover:bg-primary/90 active:scale-[0.98] shadow-sm cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Un instant…</>
              ) : isRegister ? 'Créer mon compte' : 'Se connecter'}
            </button>
          </form>
        </motion.div>

        <p className="mt-6 text-center text-[9px] font-bold text-slate-400 tracking-wider uppercase">
          Synchronisé en temps réel · Disponible hors connexion
        </p>
      </div>
    </div>
  );
};
