import { createContext, useContext } from 'react';
import type { useAdminMessages } from '../hooks/useAdminMessages';
import type { ClassInfo } from '../types';

export const TeacherMessagingContext = createContext<(ReturnType<typeof useAdminMessages> & { teacherName: string; classes: readonly Pick<ClassInfo, 'id' | 'name'>[] }) | null>(null);
export const useTeacherMessaging = () => useContext(TeacherMessagingContext);
