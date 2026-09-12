import React, { useCallback, useEffect, useState } from 'react';
import type { AdminTeacherSummary } from './api';
import { AdminApiError, adminLogout, fetchOverview } from './api';
import { AdminLogin } from './components/AdminLogin';
import { TeacherList } from './components/TeacherList';
import { TeacherDetail } from './components/TeacherDetail';
import { CalendarManager } from './components/CalendarManager';
import { OfficialBulletinManager } from './components/OfficialBulletinManager';
import { TimetableClockManager } from './components/TimetableClockManager';

type View =
    | { name: 'locked' }
    | { name: 'overview' }
    | { name: 'teacher'; phone: string }
    | { name: 'calendar' }
    | { name: 'timetableClock'; phone?: string }
    | { name: 'bulletin' };

export const AdminApp: React.FC = () => {
    const [view, setView] = useState<View>({ name: 'locked' });
    const [teachers, setTeachers] = useState<AdminTeacherSummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [bootChecked, setBootChecked] = useState(false);

    const loadOverview = useCallback(async () => {
        setIsLoading(true);
        try {
            const { teachers: list } = await fetchOverview();
            setTeachers(list);
            setView(current => (current.name === 'locked' ? { name: 'overview' } : current));
        } catch {
            setView({ name: 'locked' });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const { teachers: list } = await fetchOverview();
                setTeachers(list);
                setView({ name: 'overview' });
            } catch {
                setView({ name: 'locked' });
            } finally {
                setBootChecked(true);
            }
        })();
    }, []);

    const handleLogout = useCallback(async () => {
        await adminLogout().catch(() => undefined);
        setTeachers([]);
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
                const result = await fetchOverview(requestController.signal);
                if (!stopped && !requestController.signal.aborted) setTeachers(result.teachers);
            } catch (error) {
                if (!stopped && error instanceof AdminApiError && error.status === 401) setView({ name: 'locked' });
            } finally {
                window.clearTimeout(timeout);
                controller = null;
            }
        };
        const interval = window.setInterval(() => { void refresh(); }, 30_000);
        const wake = () => { void refresh(); };
        window.addEventListener('online', wake);
        document.addEventListener('visibilitychange', wake);
        return () => {
            stopped = true;
            controller?.abort();
            window.clearInterval(interval);
            window.removeEventListener('online', wake);
            document.removeEventListener('visibilitychange', wake);
        };
    }, [view.name, isLoading]);

    if (!bootChecked) {
        return (
            <div className="flex min-h-dvh items-center justify-center text-muted-foreground" style={{ backgroundColor: 'var(--clr-bg)' }}>
                Chargement…
            </div>
        );
    }
    if (view.name === 'locked') return <AdminLogin onSuccess={loadOverview} />;
    if (view.name === 'teacher') {
        return (
            <TeacherDetail
                phone={view.phone}
                onManageTimetable={() => setView({ name: 'timetableClock', phone: view.phone })}
                onBack={() => {
                    setView({ name: 'overview' });
                    void loadOverview();
                }}
            />
        );
    }
    if (view.name === 'calendar') return <CalendarManager onBack={() => setView({ name: 'overview' })} />;
    if (view.name === 'timetableClock') {
        return (
            <TimetableClockManager
                phone={view.phone}
                onBack={() => setView(view.phone ? { name: 'teacher', phone: view.phone } : { name: 'overview' })}
            />
        );
    }
    if (view.name === 'bulletin') return <OfficialBulletinManager onBack={() => setView({ name: 'overview' })} />;

    return (
        <div className="min-h-dvh" style={{ backgroundColor: 'var(--clr-bg)' }}>
            <div className="mx-auto flex max-w-6xl flex-wrap justify-end gap-2 px-4 pt-4 sm:px-8">
                <button onClick={() => setView({ name: 'timetableClock' })} className="min-h-11 rounded-xl border border-border bg-card px-4 text-xs font-bold text-foreground shadow-sm hover:bg-muted">
                    Horaires des séances
                </button>
                <button onClick={() => setView({ name: 'bulletin' })} className="min-h-11 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm">
                    Bulletin officiel JSON
                </button>
                <button onClick={() => setView({ name: 'calendar' })} className="min-h-11 rounded-xl bg-foreground px-4 text-xs font-bold text-primary-foreground shadow-sm">
                    Gérer les vacances
                </button>
            </div>
            <TeacherList
                teachers={teachers}
                isLoading={isLoading}
                onRefresh={loadOverview}
                onSelect={phone => setView({ name: 'teacher', phone })}
                onLogout={handleLogout}
            />
        </div>
    );
};
