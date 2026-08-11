import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from '@/components/ui/icons';
import { formatLocalizedClassDisplayName } from '@/constants';
import type { ClassInfo } from '@/types';
import type { ModalLang, OnboardingCopy } from '../types';

interface CreatedClassesListProps {
    classes: ClassInfo[];
    lang: ModalLang;
    copy: OnboardingCopy;
    onRemove: (classInfo: ClassInfo) => void;
}

export const CreatedClassesList = memo<CreatedClassesListProps>(({ classes, lang, copy, onRemove }) => {
    if (!classes.length) return null;

    return (
        <div className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1" aria-live="polite">
            {classes.map(classInfo => (
                <div key={classInfo.id} className="flex items-center gap-3 rounded-md bg-slate-50 px-3 py-3">
                    <p className="min-w-0 flex-1 truncate text-start text-sm font-semibold text-slate-900">
                        {formatLocalizedClassDisplayName(classInfo.name, lang)}
                    </p>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
                        onClick={() => onRemove(classInfo)}
                        aria-label={copy.removeCreatedClass}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ))}
        </div>
    );
});

CreatedClassesList.displayName = 'CreatedClassesList';
