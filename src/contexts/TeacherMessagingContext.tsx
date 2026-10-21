import { createContext, useContext } from 'react';
import type { useAdminMessages } from '../hooks/useAdminMessages';

export const TeacherMessagingContext = createContext<(ReturnType<typeof useAdminMessages> & { teacherName: string }) | null>(null);
export const useTeacherMessaging = () => useContext(TeacherMessagingContext);
