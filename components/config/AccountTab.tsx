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
            <div className="rounded-xl border border-[#E4D3AC] bg-[#FFFDF7] p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#69604F] font-mono">Mon compte</h4>
                <p className="mt-2 text-lg font-bold text-[#2B241D] font-display">
                    {user ? `${user.prenom} ${user.nom}` : 'Non connecté'}
                </p>
                {user && <p className="text-sm text-[#69604F] font-sans">{user.phone}</p>}
            </div>

            <div className="rounded-xl border border-[#E4D3AC] bg-[#FFFDF7] p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#69604F] font-mono">Synchronisation</h4>
                        <p className="mt-1 text-sm font-semibold text-[#2B241D] font-sans">{STATUS_LABEL[syncStatus] ?? '—'}</p>
                        {lastSyncAt && (
                            <p className="text-[11px] text-[#A79C87] font-mono">Dernière synchro {timeAgoFr(lastSyncAt)}</p>
                        )}
                    </div>
                    <Button type="button" variant="outline" onClick={syncNow} className="h-9 text-xs border-[#E4D3AC]/80 text-[#69604F] hover:bg-[#FCF6EA] hover:text-[#2B241D]">
                        Synchroniser
                    </Button>
                </div>
            </div>

            <Button
                type="button"
                variant="outline"
                onClick={() => logout()}
                className="h-10 w-full text-sm font-semibold text-red-600 hover:bg-red-50 border-[#E4D3AC]/40"
            >
                Se déconnecter
            </Button>
        </div>
    );
};
