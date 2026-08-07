import React, { useState } from 'react';
import { adminLogin } from '../api';

export const AdminLogin: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);
        try {
            await adminLogin(code);
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Échec de connexion.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4" style={{ backgroundColor: 'var(--clr-bg)' }}>
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-lg"
            >
                <div className="mb-6 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-black text-primary-foreground">
                        A
                    </div>
                    <h1 className="text-xl font-bold text-foreground font-display">
                        Administration
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">Accès réservé — saisissez le code.</p>
                </div>
                <label className="block space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code d'accès</span>
                    <input
                        type="password"
                        value={code}
                        onChange={e => setCode(e.target.value)}
                        autoComplete="off"
                        autoFocus
                        className="flex h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        placeholder="••••••••"
                        required
                    />
                </label>
                {error && (
                    <p className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                        {error}
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
