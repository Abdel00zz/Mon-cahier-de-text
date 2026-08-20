import type { ClassInfo } from '@/types';
import { classNameForLevelAndGroup, normalizeGroupNumber } from '@/utils/classGroup';
import type { ClassDraft, ClassDraftValidation } from './types';

export const createClassDraft = (level: string, subject = ''): ClassDraft => ({
    mode: 'catalog',
    level,
    group: '',
    label: '',
    subject,
});

const normalizeClassNameKey = (value: string): string =>
    value.trim().toLocaleLowerCase('fr').replace(/\s+/g, ' ');

export const validateClassDraft = (draft: ClassDraft, classes: ClassInfo[]): ClassDraftValidation => {
    const groupNumber = draft.mode === 'catalog' ? normalizeGroupNumber(draft.group) : null;
    const name = draft.mode === 'catalog'
        ? (draft.level && groupNumber ? classNameForLevelAndGroup(draft.level, groupNumber) : null)
        : draft.label.trim().replace(/\s+/g, ' ');
    const normalizedName = name ? normalizeClassNameKey(name) : null;

    if (draft.mode === 'catalog') {
        if (!draft.group.trim()) return { name, issue: 'missingGroup' };
        if (!groupNumber) return { name, issue: 'invalidGroup' };
    } else if (!name) {
        return { name, issue: 'missingLabel' };
    }

    if (normalizedName && classes.some(classInfo => normalizeClassNameKey(classInfo.name) === normalizedName)) {
        return { name, issue: 'existingClass' };
    }

    return { name, issue: null };
};
