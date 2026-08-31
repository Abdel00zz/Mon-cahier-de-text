import { memo, useState } from 'react';
import {
  formatLocalizedClassDisplayName,
  formatLocalizedSubjectDisplayName,
} from '@/constants';
import { keepToneForClass } from '@/utils/keepTheme';
import { BookOpen, Plus, Trash2 } from '@/components/ui/icons';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { ClassInfo } from '@/types';
import type { ModalLang, OnboardingCopy } from '../types';

interface ClassesStepProps {
  classes: ClassInfo[];
  lang: ModalLang;
  copy: OnboardingCopy;
  onAdd: () => void;
  onRemove: (classInfo: ClassInfo) => void;
}

/** Real classes, shared class wizard, no second creation algorithm to maintain. */
export const ClassesStep = memo<ClassesStepProps>(
  ({ classes, lang, copy, onAdd, onRemove }) => {
    const [pendingDelete, setPendingDelete] = useState<ClassInfo | null>(null);
    return (
      <div className="space-y-4">
        <p className="text-sm text-[#5f6368] dark:text-[#bdc1c6]" role="status">
          {classes.length
            ? copy.configuredClassesCount(classes.length)
            : copy.noClassSelectedYet}
        </p>
        {classes.length === 0 ? (
          <div className="keep-surface flex min-h-48 flex-col items-center justify-center gap-4 p-6 text-center">
            <BookOpen
              className="h-8 w-8 text-[#5f6368] dark:text-[#bdc1c6]"
              aria-hidden="true"
            />
            <p className="max-w-sm text-sm leading-relaxed">
              {lang === 'ar'
                ? 'أضف أول قسم. ستجده جاهزاً في لوحة التحكم لتبدأ دفتر نصوصه.'
                : 'Ajoutez votre première classe. Elle sera prête sur le tableau de bord pour commencer son cahier.'}
            </p>
          </div>
        ) : (
          <>
            <ul className="grid gap-3 sm:grid-cols-2">
              {classes.map((classInfo) => (
                <li
                  key={classInfo.id}
                  data-keep-tone={keepToneForClass(classInfo.id)}
                  className="keep-surface flex min-w-0 items-center gap-2 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-base font-semibold"
                      title={formatLocalizedClassDisplayName(
                        classInfo.name,
                        lang,
                      )}
                    >
                      {formatLocalizedClassDisplayName(classInfo.name, lang)}
                    </p>
                    <p className="mt-1 truncate text-sm text-[#5f6368] dark:text-[#bdc1c6]">
                      {formatLocalizedSubjectDisplayName(
                        classInfo.subject,
                        lang,
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(classInfo)}
                    aria-label={
                      copy.removeCreatedClass +
                      ' ' +
                      formatLocalizedClassDisplayName(classInfo.name, lang)
                    }
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#5f6368] hover:bg-black/5 focus-visible:outline-2 dark:text-[#bdc1c6] dark:hover:bg-white/10"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onAdd}
              className="keep-surface keep-interactive inline-flex min-h-11 items-center gap-2 px-4 text-sm font-medium"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {copy.addClass}
            </button>
          </>
        )}
        <ConfirmDialog
          open={Boolean(pendingDelete)}
          onOpenChange={(open) => {
            if (!open) setPendingDelete(null);
          }}
          title={copy.removeClassTitle}
          description={copy.removeClassDescription}
          confirmationPhrase={
            pendingDelete
              ? formatLocalizedClassDisplayName(pendingDelete.name, lang)
              : undefined
          }
          confirmationHint={copy.customClassName}
          confirmLabel={copy.removeCreatedClass}
          onConfirm={() => {
            if (pendingDelete) onRemove(pendingDelete);
            setPendingDelete(null);
          }}
        />
      </div>
    );
  },
);
ClassesStep.displayName = 'ClassesStep';
