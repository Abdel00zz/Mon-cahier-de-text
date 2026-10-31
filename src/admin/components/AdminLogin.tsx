import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { adminLogin } from '../api';

const AdminLoginSchema = z.object({
    code: z.string().min(1, 'Code requis.'),
});

type AdminLoginValues = z.infer<typeof AdminLoginSchema>;

export const AdminLogin: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
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
                message: err instanceof Error ? err.message : 'Échec de connexion.',
            });
        }
    });

    const errorMessage = errors.root?.message ?? errors.code?.message ?? null;

    return (
        <div className="admin-shell admin-login flex min-h-dvh items-center justify-center p-4" style={{ backgroundColor: 'var(--clr-bg)' }}>
            <form
                onSubmit={onSubmit}
                className="admin-login__card w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-lg"
            >
                <div className="mb-6 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-black text-primary-foreground">
                        A
                    </div>
                    <h1 className="text-xl font-bold text-foreground tracking-tight">
                        Administration
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">Accès réservé, saisissez le code.</p>
                </div>
                <label className="block space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code d'accès</span>
                    <input
                        type="password"
                        {...register('code')}
                        autoComplete="off"
                        autoFocus
                        className="flex h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        placeholder="••••••••"
                        required
                    />
                </label>
                {errorMessage && (
                    <p className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                        {errorMessage}
                    </p>
                )}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-5 h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                    {isSubmitting ? 'Vérification…' : 'Accéder au tableau de bord'}
                </button>
            </form>
        </div>
    );
};
