import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { startForegroundPolling } from '../platform/mobileScheduling';
import { StatusNotice } from '../components/ui/status-notice';
import { Skeleton } from '../components/ui/skeleton';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import type { AdminOverview, AdminTeacherSummary } from './api';
import { AdminApiError, adminLogout, fetchOverview } from './api';
import { AdminLogin } from './components/AdminLogin';
import { TeacherList } from './components/TeacherList';
import { hashToView, sameView, viewToHash, type AdminView } from './route';
import { ArrowUpRight, BookOpen, CalendarDays, Clock, FileText, History, ShieldCheck, SlidersHorizontal } from 'lucide-react';

/*
 * Seuls la connexion et la liste partent avec la première page : la fiche d'un
 * enseignant (la plus lourde), le calendrier, les horaires, la politique et le
 * bulletin ne sont téléchargés qu'à l'ouverture de leur écran.
 */
const TeacherDetail = lazy(() => import('./components/TeacherDetail').then(module => ({ default: module.TeacherDetail })));
const CalendarManager = lazy(() => import('./components/CalendarManager').then(module => ({ default: module.CalendarManager })));
const OfficialBulletinManager = lazy(() => import('./components/OfficialBulletinManager').then(module => ({ default: module.OfficialBulletinManager })));
const TimetableClockManager = lazy(() => import('./components/TimetableClockManager').then(module => ({ default: module.TimetableClockManager })));
const EvaluationPolicyManager = lazy(() => import('./components/EvaluationPolicyManager').then(module => ({ default: module.EvaluationPolicyManager })));
const AuditLog = lazy(() => import('./components/AuditLog').then(module => ({ default: module.AuditLog })));

/** Gabarit de chargement d'un écran : même colonne et mêmes blocs que la page qui arrive (aucun saut). */
const AdminViewFallback: React.FC = () => (
    <div className="admin-shell mx-auto min-h-dvh max-w-5xl space-y-4 p-4 sm:p-8" style={{ backgroundColor: 'var(--clr-bg)' }} role="status" aria-busy="true">
        <Skeleton className="h-11 w-28 rounded-xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <span className="sr-only">Chargement…</span>
    </div>
);

export const AdminApp: React.FC = () => {
    const [view, setView] = useState<AdminView>({ name: 'locked' });
    const [teachers, setTeachers] = useState<AdminTeacherSummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [bootChecked, setBootChecked] = useState(false);
    const [overviewError, setOverviewError] = useState<string | null>(null);
    const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
    const [refreshFailed, setRefreshFailed] = useState(false);
    const generation = useRef(0);
    /** Empreinte de la liste affichée : le serveur ne renvoie la liste que si elle a changé. */
    const etag = useRef<string | null>(null);
    /** Écran demandé par l'adresse à l'ouverture : on y arrive dès que la session est confirmée. */
    const bootView = useRef<AdminView>(hashToView(window.location.hash));

    const applyOverview = useCallback((result: AdminOverview) => {
        if (!result.unchanged) setTeachers(result.teachers);
        etag.current = result.etag;
        setLastUpdatedAt(Date.now());
        setRefreshFailed(false);
    }, []);

    const loadOverview = useCallback(async () => {
        const revision = ++generation.current;
        setIsLoading(true);
        try {
            const result = await fetchOverview(undefined, etag.current);
            if (revision !== generation.current) return;
            applyOverview(result);
            setOverviewError(null);
            setView(current => (current.name === 'locked' ? bootView.current : current));
        } catch (error) {
            if (revision !== generation.current) return;
            if (error instanceof AdminApiError && error.status === 401) setView({ name: 'locked' });
            else {
                setOverviewError('Actualisation indisponible. Vérifiez la connexion puis réessayez.');
                setRefreshFailed(true);
            }
        } finally {
            if (revision === generation.current) setIsLoading(false);
        }
    }, [applyOverview]);

    useEffect(() => {
        let cancelled = false;
        void loadOverview().finally(() => { if (!cancelled) setBootChecked(true); });
        return () => { cancelled = true; generation.current++; };
    }, [loadOverview]);

    /** Un écran, une adresse : le bouton Précédent du navigateur revient à l'écran d'avant. */
    const go = useCallback((next: AdminView) => {
        setView(next);
        const hash = viewToHash(next);
        if (window.location.hash !== hash) window.location.hash = hash;
    }, []);

    // Référence stable : les cartes mémorisées de la liste ne se redessinent pas à chaque rendu du parent.
    const openTeacher = useCallback((phone: string) => go({ name: 'teacher', phone }), [go]);

    useEffect(() => {
        const onHashChange = () => {
            const target = hashToView(window.location.hash);
            setView(current => (current.name === 'locked' || sameView(current, target) ? current : target));
        };
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    const handleLogout = useCallback(async () => {
        generation.current++;
        await adminLogout().catch(() => undefined);
        etag.current = null;
        bootView.current = { name: 'overview' };
        setTeachers([]);
        setLastUpdatedAt(null);
        setIsLoading(false);
        setView({ name: 'locked' });
    }, []);

    // Only refresh the overview: never replace an administrator's open form.
    useEffect(() => {
        if (view.name !== 'overview' || isLoading) return;
        let stopped = false;
        let controller: AbortController | null = null;
        const refresh = async () => {
            if (stopped || controller || document.visibilityState === 'hidden' || !navigator.onLine) return;
            const requestController = new AbortController();
            controller = requestController;
            const timeout = window.setTimeout(() => requestController.abort(), 15_000);
            try {
                const result = await fetchOverview(requestController.signal, etag.current);
                if (!stopped && !requestController.signal.aborted) applyOverview(result);
                return true;
            } catch (error) {
                if (!stopped && error instanceof AdminApiError && error.status === 401) setView({ name: 'locked' });
                else if (!stopped && !requestController.signal.aborted) setRefreshFailed(true);
                return requestController.signal.aborted ? undefined : false;
            } finally {
                window.clearTimeout(timeout);
                controller = null;
            }
        };
        const stopPolling = startForegroundPolling(refresh, { interval: 30_000, onInactive: () => controller?.abort() });
        return () => {
            stopped = true;
            controller?.abort();
            stopPolling();
        };
    }, [view.name, isLoading, applyOverview]);

    if (!bootChecked) {
        return (
            <div className="admin-shell admin-loading flex min-h-dvh items-center justify-center text-muted-foreground" style={{ backgroundColor: 'var(--clr-bg)' }}>
                Chargement…
            </div>
        );
    }
    if (view.name === 'locked') return <AdminLogin onSuccess={loadOverview} />;

    const toOverview = () => go({ name: 'overview' });
    const backToTeacherOr = (phone?: string) => go(phone ? { name: 'teacher', phone } : { name: 'overview' });

    if (view.name === 'teacher') {
        return (
            <Suspense fallback={<AdminViewFallback />}>
                <TeacherDetail
                    phone={view.phone}
                    onManageTimetable={() => go({ name: 'timetableClock', phone: view.phone })}
                    onManageEvaluationPolicy={() => go({ name: 'evaluationPolicy', phone: view.phone })}
                    onBack={() => {
                        toOverview();
                        void loadOverview();
                    }}
                />
            </Suspense>
        );
    }
    if (view.name === 'calendar') return <Suspense fallback={<AdminViewFallback />}><CalendarManager onBack={toOverview} /></Suspense>;
    if (view.name === 'timetableClock') {
        return <Suspense fallback={<AdminViewFallback />}><TimetableClockManager phone={view.phone} onBack={() => backToTeacherOr(view.phone)} /></Suspense>;
    }
    if (view.name === 'evaluationPolicy') {
        return <Suspense fallback={<AdminViewFallback />}><EvaluationPolicyManager phone={view.phone} onBack={() => backToTeacherOr(view.phone)} /></Suspense>;
    }
    if (view.name === 'bulletin') return <Suspense fallback={<AdminViewFallback />}><OfficialBulletinManager onBack={toOverview} /></Suspense>;
    if (view.name === 'journal') return <Suspense fallback={<AdminViewFallback />}><AuditLog onBack={toOverview} onOpenTeacher={openTeacher} /></Suspense>;

    return (
        <div className="admin-shell min-h-dvh" style={{ backgroundColor: 'var(--clr-bg)' }}>
            <nav aria-label="Outils administratifs" className="admin-commandbar mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2.5 px-4 pt-3 pb-3 sm:px-8">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1.5 border-primary/25 bg-primary/10 px-2.5 py-1 text-primary">
                        <ShieldCheck data-icon="inline-start" aria-hidden="true" />
                        Dashboard Direction
                    </Badge>
                    <Badge variant="secondary" className="hidden gap-1.5 text-xs sm:inline-flex">
                        <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
                        Synchronisation active
                    </Badge>
                    <Button asChild variant="outline" size="sm" title="Basculer vers la session utilisateur (Mon cahier de textes)">
                        <a href="/">
                            <BookOpen data-icon="inline-start" className="text-primary" aria-hidden="true" />
                            <span>Session enseignant</span>
                            <ArrowUpRight data-icon="inline-end" className="text-muted-foreground opacity-60" aria-hidden="true" />
                        </a>
                    </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={() => go({ name: 'timetableClock' })} variant="outline" size="sm" className="admin-commandbar__action--schedule">
                        <Clock data-icon="inline-start" aria-hidden />
                        Horaires des séances
                    </Button>
                    <Button onClick={() => go({ name: 'journal' })} variant="outline" size="sm" className="admin-commandbar__action--journal">
                        <History data-icon="inline-start" aria-hidden />
                        Journal
                    </Button>
                    <Button onClick={() => go({ name: 'evaluationPolicy' })} variant="outline" size="sm" className="admin-commandbar__action--policy">
                        <SlidersHorizontal data-icon="inline-start" aria-hidden />
                        Contrôle continu
                    </Button>
                    <Button onClick={() => go({ name: 'bulletin' })} variant="accent" size="sm">
                        <FileText data-icon="inline-start" aria-hidden />
                        Bulletin officiel JSON
                    </Button>
                    <Button onClick={() => go({ name: 'calendar' })} variant="charcoal" size="sm">
                        <CalendarDays data-icon="inline-start" aria-hidden />
                        Gérer les vacances
                    </Button>
                </div>
            </nav>
            {overviewError && <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-8"><StatusNotice tone="warning" title={overviewError} announce /></div>}
            <TeacherList
                teachers={teachers}
                isLoading={isLoading}
                lastUpdatedAt={lastUpdatedAt}
                refreshFailed={refreshFailed}
                onRefresh={loadOverview}
                onSelect={openTeacher}
                onLogout={handleLogout}
            />
        </div>
    );
};
