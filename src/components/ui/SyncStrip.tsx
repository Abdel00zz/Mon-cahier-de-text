import React from 'react';
import { useSync } from '@/contexts/SyncContext';
import './sync-strip.css';

/**
 * Liseré discret pendant une synchronisation.
 *
 * Il remplace l'écran d'attente : l'enseignant continue de travailler, la ligne
 * indique seulement qu'un échange est en cours (150 ms à l'apparition, aucune
 * animation si `prefers-reduced-motion`).
 */
export const SyncStrip: React.FC = () => {
    const { syncStatus } = useSync();
    const visible = syncStatus === 'syncing' || syncStatus === 'pending';
    return <div className="sync-strip" data-state={visible ? syncStatus : 'idle'} aria-hidden="true" />;
};
