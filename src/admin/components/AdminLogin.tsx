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
        <div className="admin-shell admin-login flex min-h-dvh items-center justify-center px-4 py-8 sm:px-6" style={{ backgroundColor: 'var(--clr-bg)' }} dir={isAr ? 'rtl' : 'ltr'}>
            <form
                onSubmit={onSubmit}
                className="admin-login__card w-full max-w-lg rounded-2xl border border-border bg-card p-5 sm:p-8"
            >
                <div className="mb-4 flex items-center justify-between border-b border-border/80 pb-3">
                    <span className="inline-flex items-center gap-2 rounded-lg border border-primary/15 bg-primary/[0.06] px-2.5 py-1.5 text-[11px] font-semibold text-primary">
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        {isAr ? 'فضاء الإدارة والمدير' : 'Espace Direction & Administration'}
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setLocale(current => (current === 'fr' ? 'ar' : 'fr'))}
                        title={isAr ? 'Changer de langue' : 'تغيير اللغة'}
                    >
                        {isAr ? 'FR' : 'العربية'}
                    </Button>
                </div>

                <div className="mb-6 text-center">
                    <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/[0.08] text-primary">
                        <ShieldCheck className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h1 className="text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl">
                        {isAr ? 'لوحة قيادة المؤسسة' : 'Tableau de bord de l’établissement'}
                    </h1>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        {isAr
                            ? 'فضاء مخصص لإدارة المؤسسة لمراقبة وتتبع دفاتر النصوص والمذكرات الرسمية وتدبير الأقسام.'
                            : 'Supervision des cahiers de textes, arrêtés ministériels et emploi du temps scolaire.'}
                    </p>
                </div>

                <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-foreground">
                        {isAr ? 'رمز الدخول السري' : 'Code d’accès administratif'}
                    </span>
                    <Input
                        type="password"
                        {...register('code')}
                        autoComplete="current-password"
                        autoFocus
                        aria-invalid={Boolean(errors.code || errors.root)}
                        aria-describedby={errorMessage ? 'admin-login-error' : undefined}
                        className="flex h-12 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        placeholder="••••••••"
                        required
                    />
                </label>
                {errorMessage && (
                    <p id="admin-login-error" role="alert" className="mt-3 rounded-lg border border-destructive/30 bg-destructive/[0.07] px-3 py-2.5 text-xs font-medium leading-relaxed text-destructive">
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
                    <Button asChild variant="outline" className="mt-2 min-h-10 w-full text-xs font-semibold">
                        <a href="/">
                            <BookOpen data-icon="inline-start" className="text-primary" aria-hidden="true" />
                            <span>{isAr ? 'الولوج إلى فضاء الأستاذ (دفتر نصوصي)' : 'Accéder à la session enseignant'}</span>
                        </a>
                    </Button>
                </div>
            </form>
        </div>
    );
};
