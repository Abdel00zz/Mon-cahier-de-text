import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSync } from '../../contexts/SyncContext';
import { Button } from '../ui/button';

const timeAgoFr = (iso: string): string => {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '—';
    const minutes = Math.floor((Date.now() - then) / 60_000);
    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours} h`;
    return new Date(iso).toLocaleDateString('fr-FR');
};

const STATUS_LABEL: Record<string, string> = {
    idle: 'En attente',
    synced: 'Synchronisé',
    syncing: 'Synchronisation en cours…',
    pending: 'Modifications en attente',
    offline: 'Hors ligne',
    error: 'Erreur de synchronisation',
};

export const AccountTab: React.FC = () => {
    const { user, logout } = useAuth();
    const { syncStatus, lastSyncAt, syncNow } = useSync();

    return (
        <div className="space-y-3">
            <div className="rounded-xl border border-border bg-white p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mon compte</h4>
                <p className="mt-2 text-lg font-bold text-slate-800">
                    {user ? `${user.prenom} ${user.nom}` : 'Non connecté'}
                </p>
                {user && <p className="text-sm text-slate-500">{user.phone}</p>}
            </div>

            <div className="rounded-xl border border-border bg-white p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Synchronisation</h4>
                        <p className="mt-1 text-sm font-semibold text-slate-700">{STATUS_LABEL[syncStatus] ?? '—'}</p>
                        {lastSyncAt && (
                            <p className="text-[11px] text-slate-400">Dernière synchro {timeAgoFr(lastSyncAt)}</p>
                        )}
                    </div>
                    <Button type="button" variant="outline" onClick={syncNow} className="h-9 text-xs">
                        Synchroniser
                    </Button>
                </div>
            </div>

            <Button
                type="button"
                variant="outline"
                onClick={() => logout()}
                className="h-10 w-full text-sm font-semibold text-red-600 hover:bg-red-50"
            >
                Se déconnecter
            </Button>
        </div>
    );
};
