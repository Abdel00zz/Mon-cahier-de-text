import React, { useCallback, useEffect, useState } from 'react';
import type { TeacherSnapshot } from '../types';
import { adminLogout, fetchOverview } from './api';
import { AdminLogin } from './components/AdminLogin';
import { TeacherList } from './components/TeacherList';
import { TeacherDetail } from './components/TeacherDetail';
import { CalendarManager } from './components/CalendarManager';

type View = { name: 'locked' } | { name: 'overview' } | { name: 'teacher'; phone: string } | { name: 'calendar' };

export const AdminApp: React.FC = () => {
    const [view, setView] = useState<View>({ name: 'locked' });
    const [teachers, setTeachers] = useState<TeacherSnapshot[]>([]);
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

    // Session admin déjà active ? (cookie httpOnly)
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

    if (!bootChecked) {
        return (
            <div className="flex min-h-screen items-center justify-center text-muted-foreground" style={{ backgroundColor: 'var(--clr-bg)' }}>
                Chargement…
            </div>
        );
    }

    if (view.name === 'locked') {
        return <AdminLogin onSuccess={loadOverview} />;
    }

    if (view.name === 'teacher') {
        return <TeacherDetail phone={view.phone} onBack={() => setView({ name: 'overview' })} />;
    }

    if (view.name === 'calendar') {
        return <CalendarManager onBack={() => setView({ name: 'overview' })} />;
    }

    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--clr-bg)' }}>
            <div className="mx-auto flex max-w-6xl justify-end px-4 pt-4 sm:px-8">
                <button onClick={() => setView({ name: 'calendar' })} className="h-10 rounded-xl bg-foreground px-4 text-xs font-bold text-primary-foreground shadow-sm">
                    GÃ©rer le calendrier
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
