import React from 'react';
import { User, Phone, School, Award, Check } from 'lucide-react';
import type { UserProfile } from '../types';

interface ProfileTabProps {
  profile: UserProfile;
  onChange: (updatedProfile: UserProfile) => void;
}

const AVAILABLE_SUBJECTS = [
  'Mathématiques',
  'Physique-Chimie',
  'SVT',
  'Informatique',
  'Français',
  'Arabe',
  'Philosophie',
  'Histoire-Géo',
  'Anglais',
];

const EDUCATION_CYCLES: { id: UserProfile['educationCycle']; fr: string; ar: string }[] = [
  { id: 'middle', fr: 'Collège', ar: 'ثانوي إعدادي' },
  { id: 'high_school', fr: 'Lycée Qualifiant', ar: 'ثانوي تأهيلي' },
  { id: 'prep', fr: 'Classes Préparatoires', ar: 'الأقسام التحضيرية' },
];

export const ProfileTab: React.FC<ProfileTabProps> = ({ profile, onChange }) => {
  const handleTextChange = (field: keyof UserProfile, value: string) => {
    onChange({ ...profile, [field]: value });
  };

  const toggleSubject = (subjectName: string) => {
    const exists = profile.subjects.includes(subjectName);
    const updated = exists
      ? profile.subjects.filter(s => s !== subjectName)
      : [...profile.subjects, subjectName];
    onChange({ ...profile, subjects: updated });
  };

  return (
    <div className="space-y-4">
      {/* Nom & Téléphone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-espresso-900 dark:text-foreground mb-1.5 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-espresso-800/60 dark:text-muted-foreground" />
            <span>Nom complet / الاسم الكامل</span>
          </label>
          <input
            type="text"
            value={profile.teacherName}
            onChange={e => handleTextChange('teacherName', e.target.value)}
            placeholder="Ex. Professeur Alami"
            className="w-full rounded-xl border border-cream-300 dark:border-border bg-cream-50 dark:bg-card px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-terracotta-500 focus:outline-none focus:ring-2 focus:ring-terracotta-500/20"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-espresso-900 dark:text-foreground mb-1.5 flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-espresso-800/60 dark:text-muted-foreground" />
            <span>Téléphone / الهاتف</span>
          </label>
          <input
            type="tel"
            value={profile.phone}
            onChange={e => handleTextChange('phone', e.target.value)}
            placeholder="06XXXXXXXX"
            className="w-full rounded-xl border border-cream-300 dark:border-border bg-cream-50 dark:bg-card px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-terracotta-500 focus:outline-none focus:ring-2 focus:ring-terracotta-500/20"
          />
        </div>
      </div>

      {/* Cycle d'enseignement */}
      <div>
        <label className="block text-xs font-bold text-espresso-900 dark:text-foreground mb-1.5 flex items-center gap-1.5">
          <Award className="h-3.5 w-3.5 text-espresso-800/60 dark:text-muted-foreground" />
          <span>Cycle d'enseignement / السلك التعليمي</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {EDUCATION_CYCLES.map(cycle => {
            const isSelected = profile.educationCycle === cycle.id;
            return (
              <button
                key={cycle.id}
                type="button"
                onClick={() => onChange({ ...profile, educationCycle: cycle.id })}
                className={`touch-target flex items-center justify-between rounded-xl border p-2.5 text-xs font-medium transition-all ${
                  isSelected
                    ? 'border-terracotta-500 bg-terracotta-500/10 text-terracotta-700 dark:text-orange-400 font-bold'
                    : 'border-cream-300 dark:border-border bg-cream-50 dark:bg-card text-espresso-800/80 dark:text-muted-foreground hover:bg-cream-100'
                }`}
              >
                <div className="text-start">
                  <div className="leading-tight">{cycle.fr}</div>
                  <div className="text-[10px] opacity-75 leading-tight">{cycle.ar}</div>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-terracotta-600" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Matières enseignées (Pills) */}
      <div>
        <label className="block text-xs font-bold text-espresso-900 dark:text-foreground mb-1.5">
          Matières enseignées / المواد المدرسة
        </label>
        <div className="flex flex-wrap gap-1.5">
          {AVAILABLE_SUBJECTS.map(subject => {
            const isSelected = profile.subjects.includes(subject);
            return (
              <button
                key={subject}
                type="button"
                onClick={() => toggleSubject(subject)}
                className={`touch-target inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-espresso-900 text-cream-50 dark:bg-primary dark:text-primary-foreground shadow-2xs'
                    : 'bg-cream-200/80 text-espresso-800 dark:bg-muted dark:text-muted-foreground hover:bg-cream-300'
                }`}
              >
                <span>{subject}</span>
                {isSelected && <Check className="h-3 w-3 text-terracotta-500 dark:text-primary-foreground" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Établissement & Académie */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-espresso-900 dark:text-foreground mb-1.5 flex items-center gap-1.5">
            <School className="h-3.5 w-3.5 text-espresso-800/60 dark:text-muted-foreground" />
            <span>Établissement scolaire / المؤسسة</span>
          </label>
          <input
            type="text"
            value={profile.schoolName}
            onChange={e => handleTextChange('schoolName', e.target.value)}
            placeholder="Ex. Lycée Ibn Khaldoun"
            className="w-full rounded-xl border border-cream-300 dark:border-border bg-cream-50 dark:bg-card px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-terracotta-500 focus:outline-none focus:ring-2 focus:ring-terracotta-500/20"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-espresso-900 dark:text-foreground mb-1.5">
            Académie régionale / الأكاديمية الجهوية
          </label>
          <input
            type="text"
            value={profile.academy}
            onChange={e => handleTextChange('academy', e.target.value)}
            placeholder="Ex. Rabat-Salé-Kénitra"
            className="w-full rounded-xl border border-cream-300 dark:border-border bg-cream-50 dark:bg-card px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-terracotta-500 focus:outline-none focus:ring-2 focus:ring-terracotta-500/20"
          />
        </div>
      </div>
    </div>
  );
};
