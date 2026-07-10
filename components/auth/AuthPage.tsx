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
          className="h-12 rounded-2xl border-2 border-[#e8e4d9] bg-[#fdfbf7] focus-visible:ring-[#84a98c]/30 text-[#2f3e46] font-bold pr-12"
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
    <div className="flex min-h-dvh w-full flex-col justify-center overflow-x-hidden px-4 py-5 safe-bottom bg-[#fdfbf7] relative">
      {/* Grid paper texture (Seyès / school notebook checkered format) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(132,169,140,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(132,169,140,0.06)_1px,transparent_1px)] bg-[size:18px_18px] pointer-events-none z-0" />

      {/* Background Blob Effect */}
      <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-gradient-to-br from-[#e8f0ec] to-[#f4f1ea] blur-3xl opacity-50 z-0"></div>
      <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-gradient-to-tr from-[#fff3ec] to-[#fdfbf7] blur-3xl opacity-50 z-0"></div>

      <div className="mx-auto w-full max-w-sm relative z-10">
        {/* En-tête compact */}
        <div className="mb-6 flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 mb-4 shrink-0 items-center justify-center rounded-2xl bg-[#f4f1ea] border-2 border-[#e8e4d9] text-[#52796f] shadow-sm transform transition-all duration-500 hover:scale-110 hover:rotate-6">
            <BookOpen className="h-8 w-8" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-black leading-tight text-[#2f3e46]">Cahier de Textes</h1>
            <p className="mt-1 text-[13px] font-semibold text-[#84a98c]">Votre hub d'enseignant, partout.</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-[2.5rem] border-2 border-[#e8e4d9] bg-white p-6 shadow-[0_20px_60px_-15px_rgba(82,121,111,0.15)] sm:p-8"
        >
          {/* Onglets */}
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-[#f4f1ea] p-1.5 border border-[#e8e4d9]">
            {(['login', 'register'] as const).map(value => (
              <button
                key={value}
                type="button"
                onClick={() => switchMode(value)}
                className={`relative min-h-11 rounded-xl px-3 text-[13px] font-bold transition-colors ${mode === value ? 'text-white' : 'text-[#84a98c] hover:text-[#52796f]'}`}
              >
                {mode === value && (
                  <motion.span layoutId="auth-tab" className="absolute inset-0 rounded-xl bg-[#52796f] shadow-md" transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />
                )}
                <span className="relative">{value === 'login' ? 'Connexion' : 'Créer un compte'}</span>
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
                    <span className="block text-[12px] font-extrabold uppercase tracking-wider text-[#cad2c5] mb-1">Nom</span>
                    <Input value={nom} onChange={e => setNom(e.target.value)} autoComplete="family-name" placeholder="Benali" className="h-12 rounded-2xl border-2 border-[#e8e4d9] bg-[#fdfbf7] focus-visible:ring-[#84a98c]/30 text-[#2f3e46] font-bold" />
                  </label>
                  <label className="block">
                    <span className="block text-[12px] font-extrabold uppercase tracking-wider text-[#cad2c5] mb-1">Prénom</span>
                    <Input value={prenom} onChange={e => setPrenom(e.target.value)} autoComplete="given-name" placeholder="Malek" className="h-12 rounded-2xl border-2 border-[#e8e4d9] bg-[#fdfbf7] focus-visible:ring-[#84a98c]/30 text-[#2f3e46] font-bold" />
                  </label>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Téléphone */}
            <label className="block">
              <span className="block text-[12px] font-extrabold uppercase tracking-wider text-[#cad2c5] mb-1">Téléphone portable</span>
              <div className="relative">
                <Input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={e => setPhone(formatMoroccanPhone(e.target.value))}
                  autoComplete="tel"
                  placeholder="06 12 34 56 78"
                  required
                  className="h-12 rounded-2xl border-2 border-[#e8e4d9] bg-[#fdfbf7] focus-visible:ring-[#84a98c]/30 text-[#2f3e46] font-bold pr-10"
                />
                {phoneValid && <CircleCheck className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#52796f] animate-fade-in" />}
              </div>
            </label>

            {/* Mot de passe */}
            <label className="block">
              <span className="block text-[12px] font-extrabold uppercase tracking-wider text-[#cad2c5] mb-1">Mot de passe</span>
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
                    <span className="block text-[12px] font-extrabold uppercase tracking-wider text-[#cad2c5] mb-1">Confirmer le mot de passe</span>
                    <PasswordInput value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
                  </label>

                  {/* Jauge de force + validations, sur une ligne compacte */}
                  {password.length > 0 && (
                    <div className="flex items-center gap-2 animate-fade-in bg-[#f4f1ea] p-3 rounded-2xl border border-[#e8e4d9]">
                      <div className="flex flex-1 gap-1" aria-hidden>
                        {[0, 1, 2, 3].map(i => (
                          <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i < strength.score ? strength.barClass : 'bg-[#e8e4d9]'}`} />
                        ))}
                      </div>
                      <span className={`shrink-0 text-[11px] font-extrabold uppercase tracking-wider ${strength.textClass}`}>{strength.label}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-x-3 gap-y-2">
                    <LiveCheck ok={passwordLongEnough} label="8 car. min." />
                    <LiveCheck ok={passwordsMatch} label="Identiques" />
                  </div>

                  {/* Cycles */}
                  <div className="pt-2">
                    <span className="block text-[12px] font-extrabold uppercase tracking-wider text-[#cad2c5] mb-2">Cycle(s) enseigné(s)</span>
                    <div className="grid grid-cols-3 gap-2">
                      {CYCLES.map(cycle => {
                        const active = cycles.includes(cycle.value);
                        return (
                          <button
                            key={cycle.value}
                            type="button"
                            onClick={() => toggleCycle(cycle.value)}
                            aria-pressed={active}
                            className={`min-h-11 rounded-xl border-2 text-[13px] font-extrabold transition-all active:scale-95 ${active ? 'border-[#52796f] bg-[#52796f] text-white shadow-md' : 'border-[#e8e4d9] bg-[#fdfbf7] text-[#84a98c] hover:border-[#cad2c5] hover:text-[#52796f]'}`}
                          >
                            {cycle.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Matières — chips compactes */}
                  <div className="pt-2">
                    <span className="mb-2 flex items-center gap-1.5">
                      <span className="block text-[12px] font-extrabold uppercase tracking-wider text-[#cad2c5]">Matière(s) enseignée(s)</span>
                      {subjects.length > 0 && (
                        <span className="rounded-full bg-[#f4f1ea] border border-[#e8e4d9] px-2 py-0.5 text-[10px] font-black tabular-nums text-[#52796f]">{subjects.length}</span>
                      )}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {SUBJECTS.map(s => {
                        const active = subjects.includes(s);
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => toggleSubject(s)}
                            aria-pressed={active}
                            className={`min-h-9 rounded-full border-2 px-3 text-[12px] font-bold transition-all active:scale-95 ${active ? 'border-[#52796f] bg-[#52796f] text-white shadow-md' : 'border-[#e8e4d9] bg-[#fdfbf7] text-[#84a98c] hover:border-[#cad2c5] hover:text-[#52796f]'}`}
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
              <p className="rounded-xl border-2 border-[#ffd6c2] bg-[#fff3ec] px-4 py-3 text-[13px] font-bold text-[#e76f51] animate-fade-in" role="alert">
                {error}
              </p>
            )}

            <button type="submit" disabled={isSubmitting} className="group relative w-full h-14 mt-4 flex items-center justify-center gap-2 rounded-2xl bg-[#52796f] text-white text-[16px] font-black transition-all hover:bg-[#2f3e46] active:scale-[0.98] shadow-lg shadow-[#52796f]/20 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden">
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Un instant…</>
              ) : isRegister ? 'Créer mon compte' : 'Se connecter'}
            </button>
          </form>
        </motion.div>
        
        <p className="mt-6 text-center text-[12px] font-bold text-[#cad2c5] tracking-wider uppercase">
          Synchronisé en ligne · Disponible hors connexion
        </p>
      </div>
    </div>
  );
};
