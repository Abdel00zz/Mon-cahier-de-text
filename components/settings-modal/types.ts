export type SettingsTabType = 'timetable' | 'profile' | 'appearance' | 'notifications';

export interface ScheduleItem {
  id: string;
  timeRange: string;
  classGroup: string;
  subject: string;
  room: string;
  duration: string;
  colorTheme: 'ochre' | 'terracotta' | 'indigo';
}

export interface UserProfile {
  teacherName: string;
  phone: string;
  subjects: string[];
  educationCycle: 'middle' | 'high_school' | 'prep';
  schoolName: string;
  academy: string;
}

export interface SettingsData {
  profile: UserProfile;
  appearance: {
    themeMode: 'warm' | 'dark' | 'system';
    accentColor: string;
    borderRadius: 'sharp' | 'standard' | 'rounded';
  };
  notifications: {
    inApp: boolean;
    textbookReminder: boolean;
    endClassVibration: boolean;
  };
}

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedSettings: SettingsData) => Promise<void>;
  initialData: SettingsData;
  /** Optional initial active tab */
  initialTab?: SettingsTabType;
}
