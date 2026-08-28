import { ClassInfo } from '@/types';

export interface ClassScheduleColorTheme {
  key: string;
  // Hex codes for SVG and canvas rendering
  primaryHex: string;
  accentHex: string;
  glowHex: string;
  textHex: string;
  // Tailwind classes
  bgClass: string;
  borderClass: string;
  textClass: string;
  badgeBgClass: string;
  badgeTextClass: string;
}

export const CLASS_COLOR_PALETTE: ClassScheduleColorTheme[] = [
  {
    key: 'emerald',
    primaryHex: '#059669', // emerald-600
    accentHex: '#34d399',  // emerald-400
    glowHex: '#10b981',    // emerald-500
    textHex: '#ffffff',
    bgClass: 'bg-emerald-600',
    borderClass: 'border-emerald-500',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    badgeBgClass: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/60',
    badgeTextClass: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    key: 'indigo',
    primaryHex: '#4f46e5', // indigo-600
    accentHex: '#818cf8',  // indigo-400
    glowHex: '#6366f1',    // indigo-500
    textHex: '#ffffff',
    bgClass: 'bg-indigo-600',
    borderClass: 'border-indigo-500',
    textClass: 'text-indigo-600 dark:text-indigo-400',
    badgeBgClass: 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800/60',
    badgeTextClass: 'text-indigo-700 dark:text-indigo-300',
  },
  {
    key: 'amber',
    primaryHex: '#d97706', // amber-600
    accentHex: '#fbbf24',  // amber-400
    glowHex: '#f59e0b',    // amber-500
    textHex: '#ffffff',
    bgClass: 'bg-amber-600',
    borderClass: 'border-amber-500',
    textClass: 'text-amber-600 dark:text-amber-400',
    badgeBgClass: 'bg-amber-50 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border-amber-200 dark:border-amber-800/60',
    badgeTextClass: 'text-amber-700 dark:text-amber-300',
  },
  {
    key: 'purple',
    primaryHex: '#9333ea', // purple-600
    accentHex: '#c084fc',  // purple-400
    glowHex: '#a855f7',    // purple-500
    textHex: '#ffffff',
    bgClass: 'bg-purple-600',
    borderClass: 'border-purple-500',
    textClass: 'text-purple-600 dark:text-purple-400',
    badgeBgClass: 'bg-purple-50 text-purple-900 dark:bg-purple-950/70 dark:text-purple-200 border-purple-200 dark:border-purple-800/60',
    badgeTextClass: 'text-purple-700 dark:text-purple-300',
  },
  {
    key: 'teal',
    primaryHex: '#0d9488', // teal-600
    accentHex: '#2dd4bf',  // teal-400
    glowHex: '#14b8a6',    // teal-500
    textHex: '#ffffff',
    bgClass: 'bg-teal-600',
    borderClass: 'border-teal-500',
    textClass: 'text-teal-600 dark:text-teal-400',
    badgeBgClass: 'bg-teal-50 text-teal-900 dark:bg-teal-950/70 dark:text-teal-200 border-teal-200 dark:border-teal-800/60',
    badgeTextClass: 'text-teal-700 dark:text-teal-300',
  },
  {
    key: 'rose',
    primaryHex: '#e11d48', // rose-600
    accentHex: '#fb7185',  // rose-400
    glowHex: '#f43f5e',    // rose-500
    textHex: '#ffffff',
    bgClass: 'bg-rose-600',
    borderClass: 'border-rose-500',
    textClass: 'text-rose-600 dark:text-rose-400',
    badgeBgClass: 'bg-rose-50 text-rose-900 dark:bg-rose-950/70 dark:text-rose-200 border-rose-200 dark:border-rose-800/60',
    badgeTextClass: 'text-rose-700 dark:text-rose-300',
  },
  {
    key: 'sky',
    primaryHex: '#0284c7', // sky-600
    accentHex: '#38bdf8',  // sky-400
    glowHex: '#0ea5e9',    // sky-500
    textHex: '#ffffff',
    bgClass: 'bg-sky-600',
    borderClass: 'border-sky-500',
    textClass: 'text-sky-600 dark:text-sky-400',
    badgeBgClass: 'bg-sky-50 text-sky-900 dark:bg-sky-950/70 dark:text-sky-200 border-sky-200 dark:border-sky-800/60',
    badgeTextClass: 'text-sky-700 dark:text-sky-300',
  },
  {
    key: 'orange',
    primaryHex: '#ea580c', // orange-600
    accentHex: '#fb923c',  // orange-400
    glowHex: '#f97316',    // orange-500
    textHex: '#ffffff',
    bgClass: 'bg-orange-600',
    borderClass: 'border-orange-500',
    textClass: 'text-orange-600 dark:text-orange-400',
    badgeBgClass: 'bg-orange-50 text-orange-900 dark:bg-orange-950/70 dark:text-orange-200 border-orange-200 dark:border-orange-800/60',
    badgeTextClass: 'text-orange-700 dark:text-orange-300',
  },
  {
    key: 'cyan',
    primaryHex: '#0891b2', // cyan-600
    accentHex: '#22d3ee',  // cyan-400
    glowHex: '#06b6d4',    // cyan-500
    textHex: '#ffffff',
    bgClass: 'bg-cyan-600',
    borderClass: 'border-cyan-500',
    textClass: 'text-cyan-600 dark:text-cyan-400',
    badgeBgClass: 'bg-cyan-50 text-cyan-900 dark:bg-cyan-950/70 dark:text-cyan-200 border-cyan-200 dark:border-cyan-800/60',
    badgeTextClass: 'text-cyan-700 dark:text-cyan-300',
  },
  {
    key: 'fuchsia',
    primaryHex: '#c026d3', // fuchsia-600
    accentHex: '#e879f9',  // fuchsia-400
    glowHex: '#d946ef',    // fuchsia-500
    textHex: '#ffffff',
    bgClass: 'bg-fuchsia-600',
    borderClass: 'border-fuchsia-500',
    textClass: 'text-fuchsia-600 dark:text-fuchsia-400',
    badgeBgClass: 'bg-fuchsia-50 text-fuchsia-900 dark:bg-fuchsia-950/70 dark:text-fuchsia-200 border-fuchsia-200 dark:border-fuchsia-800/60',
    badgeTextClass: 'text-fuchsia-700 dark:text-fuchsia-300',
  },
];

/**
 * Maps a class to its schedule color theme based on name / level,
 * perfectly aligning with the ScheduleTab schedule matrix.
 */
export function getClassScheduleColor(classInfo?: ClassInfo | { name?: string; id?: string } | null, allClasses: ClassInfo[] = []): ClassScheduleColorTheme {
  if (!classInfo || !classInfo.name) {
    return CLASS_COLOR_PALETTE[0];
  }

  const name = (classInfo.name || '').toLowerCase();

  // If we have allClasses, try to match the exact indexed allocation from ScheduleTab
  if (allClasses.length > 0) {
    const classIdx = allClasses.findIndex(c => c.id === classInfo.id || c.name === classInfo.name);
    if (classIdx !== -1) {
      // Find preferred index
      let pref = classIdx % CLASS_COLOR_PALETTE.length;
      if (name.includes('tronc') || name.startsWith('tc') || name.includes('جذع') || name.includes('ج.م') || name.includes('ج م')) {
        pref = 0; // Emerald
      } else if (name.startsWith('1') || name.includes('1er') || name.includes('1ere') || name.includes('1bac') || name.includes('1ac') || name.includes('أولى') || name.includes('1ب')) {
        pref = 1; // Indigo
      } else if (name.startsWith('2') || name.includes('2eme') || name.includes('2ème') || name.includes('2bac') || name.includes('2ac') || name.includes('ثانية') || name.includes('2ب')) {
        pref = 2; // Amber
      } else if (name.startsWith('3') || name.includes('3eme') || name.includes('3ème') || name.includes('3ac') || name.includes('ثالثة') || name.includes('3ب')) {
        pref = 3; // Purple
      } else if (['mpsi', 'pcsi', 'mp', 'psi', 'tsi', 'ecs', 'ect'].some(p => name.includes(p))) {
        pref = 6; // Sky
      }

      // Check collisions among previous classes in the list
      const usedIndices = new Set<number>();
      for (let i = 0; i < classIdx; i++) {
        const other = allClasses[i];
        const otherName = (other.name || '').toLowerCase();
        let otherPref = i % CLASS_COLOR_PALETTE.length;
        if (otherName.includes('tronc') || otherName.startsWith('tc') || otherName.includes('جذع') || otherName.includes('ج.م') || otherName.includes('ج م')) {
          otherPref = 0;
        } else if (otherName.startsWith('1') || otherName.includes('1er') || otherName.includes('1ere') || otherName.includes('1bac') || otherName.includes('1ac') || otherName.includes('أولى') || otherName.includes('1ب')) {
          otherPref = 1;
        } else if (otherName.startsWith('2') || otherName.includes('2eme') || otherName.includes('2ème') || otherName.includes('2bac') || otherName.includes('2ac') || otherName.includes('ثانية') || otherName.includes('2ب')) {
          otherPref = 2;
        } else if (otherName.startsWith('3') || otherName.includes('3eme') || otherName.includes('3ème') || otherName.includes('3ac') || otherName.includes('ثالثة') || otherName.includes('3ب')) {
          otherPref = 3;
        } else if (['mpsi', 'pcsi', 'mp', 'psi', 'tsi', 'ecs', 'ect'].some(p => otherName.includes(p))) {
          otherPref = 6;
        }

        let otherChosen = otherPref;
        if (usedIndices.has(otherChosen)) {
          for (let offset = 1; offset < CLASS_COLOR_PALETTE.length; offset++) {
            const candidate = (otherPref + offset) % CLASS_COLOR_PALETTE.length;
            if (!usedIndices.has(candidate)) {
              otherChosen = candidate;
              break;
            }
          }
        }
        usedIndices.add(otherChosen);
      }

      let chosen = pref;
      if (usedIndices.has(chosen)) {
        for (let offset = 1; offset < CLASS_COLOR_PALETTE.length; offset++) {
          const candidate = (pref + offset) % CLASS_COLOR_PALETTE.length;
          if (!usedIndices.has(candidate)) {
            chosen = candidate;
            break;
          }
        }
      }
      return CLASS_COLOR_PALETTE[chosen];
    }
  }

  // Fallback direct heuristic
  if (name.includes('tronc') || name.startsWith('tc') || name.includes('جذع') || name.includes('ج.م') || name.includes('ج م')) {
    return CLASS_COLOR_PALETTE[0]; // Emerald
  }
  if (name.startsWith('1') || name.includes('1er') || name.includes('1ere') || name.includes('1bac') || name.includes('1ac') || name.includes('أولى') || name.includes('1ب')) {
    return CLASS_COLOR_PALETTE[1]; // Indigo
  }
  if (name.startsWith('2') || name.includes('2eme') || name.includes('2ème') || name.includes('2bac') || name.includes('2ac') || name.includes('ثانية') || name.includes('2ب')) {
    return CLASS_COLOR_PALETTE[2]; // Amber
  }
  if (name.startsWith('3') || name.includes('3eme') || name.includes('3ème') || name.includes('3ac') || name.includes('ثالثة') || name.includes('3ب')) {
    return CLASS_COLOR_PALETTE[3]; // Purple
  }
  if (['mpsi', 'pcsi', 'mp', 'psi', 'tsi', 'ecs', 'ect'].some(p => name.includes(p))) {
    return CLASS_COLOR_PALETTE[6]; // Sky
  }

  return CLASS_COLOR_PALETTE[0];
}
