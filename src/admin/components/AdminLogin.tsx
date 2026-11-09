import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { BookOpen, ShieldCheck } from '../../components/ui/icons';
import { adminLogin } from '../api';

const AdminLoginSchema = z.object({
    code: z.string().min(1, 'Code requis.'),
});

type AdminLoginValues = z.infer<typeof AdminLoginSchema>;

export const AdminLogin: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
    const [locale, setLocale] = useState<'fr' | 'ar'>('fr');
    const isAr = locale === 'ar';

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<AdminLoginValues>({
        resolver: zodResolver(AdminLoginSchema),
        defaultValues: { code: '' },
    });

    const onSubmit = handleSubmit(async ({ code }) => {
        try {
            await adminLogin(code);
            onSuccess();
        } catch (err) {
            setError('root', {
                message: err instanceof Error ? err.message : (isAr ? 'رمز الدخول غير صحيح.' : 'Échec de connexion.'),
            });
        }
    });

    const errorMessage = errors.root?.message ?? errors.code?.message ?? null;

    return (
        <div className="admin-shell admin-login flex min-h-dvh items-center justify-center p-4" style={{ backgroundColor: 'var(--clr-bg)' }} dir={isAr ? 'rtl' : 'ltr'}>
            <form
                onSubmit={onSubmit}
                className="admin-login__card w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-lg"
            >
                <div className="mb-4 flex items-center justify-between border-b border-border/80 pb-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        {isAr ? 'فضاء الإدارة والمدير' : 'Espace Direction & Administration'}
                    </span>
                    <button
                        type="button"
                        onClick={() => setLocale(current => (current === 'fr' ? 'ar' : 'fr'))}
                        className="rounded-lg border border-border px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted"
                        title={isAr ? 'Changer de langue' : 'تغيير اللغة'}
                    >
                        {isAr ? 'FR' : 'العربية'}
                    </button>
                </div>

                <div className="mb-6 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-black text-primary-foreground shadow-sm">
                        <ShieldCheck className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h1 className="text-xl font-bold text-foreground tracking-tight sm:text-2xl">
                        {isAr ? 'لوحة قيادة المؤسسة' : 'Tableau de bord de l’établissement'}
                    </h1>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        {isAr
                            ? 'فضاء مخصص لإدارة المؤسسة لمراقبة وتتبع دفاتر النصوص والمذكرات الرسمية وتدبير الأقسام.'
                            : 'Supervision des cahiers de textes, arrêtés ministériels et emploi du temps scolaire.'}
                    </p>
                </div>

                <label className="block space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {isAr ? 'رمز الدخول السري' : 'Code d’accès administratif'}
                    </span>
                    <Input
                        type="password"
                        {...register('code')}
                        autoComplete="current-password"
                        autoFocus
                        className="flex h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        placeholder="••••••••"
                        required
                    />
                </label>
                {errorMessage && (
                    <p role="alert" className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                        {errorMessage}
                    </p>
                )}
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-5 h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                    {isSubmitting ? (isAr ? 'جارٍ التحقق…' : 'Vérification…') : (isAr ? 'الولوج إلى لوحة القيادة' : 'Accéder au tableau de bord')}
                </Button>

                <div className="mt-6 text-center">
                    <p className="text-xs text-muted-foreground">
                        {isAr ? 'هل أنت أستاذ وتبحث عن دفتر نصوصك؟' : 'Vous êtes enseignant et cherchez votre cahier ?'}
                    </p>
                    <a
                        href="/"
                        className="mt-2 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-background/50 px-3.5 text-xs font-semibold text-foreground shadow-2xs hover:border-primary/40 hover:bg-muted/50 transition-colors"
                    >
                        <BookOpen className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                        <span>{isAr ? 'الولوج إلى فضاء الأستاذ (دفتر نصوصي)' : 'Accéder à la session enseignant'}</span>
                    </a>
                </div>
            </form>
        </div>
    );
};
