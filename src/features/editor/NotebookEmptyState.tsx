import React from 'react';
import type { ClassInfo, Indices } from '@/types';
import { useLocale } from '@/i18n/LocaleProvider';
import { NotebookSupport } from '@/features/messages/NotebookSupport';
import { ProudTeacherIllustration, CurriculumImportIllustration } from '@/components/ui/DynamicIllustration';
import { motion, useReducedMotion } from 'framer-motion';

/* État vide réinventé selon le design system éditorial chaud & épuré avec illustration dynamique. */
export const NotebookEmptyState: React.FC<{
  supportClass?: Pick<ClassInfo, 'id' | 'name'> & Partial<Pick<ClassInfo, 'createdAt' | 'subject'>>;
  onOpenAddContentModal: (indices?: Indices) => void;
  predefinedProgramTitle?: string;
  onLoadPredefined?: () => void;
}> = ({ onOpenAddContentModal, predefinedProgramTitle, onLoadPredefined, supportClass }) => {
    const { t, locale } = useLocale();
    const canLoadPredefined = Boolean(predefinedProgramTitle && onLoadPredefined);
    const reduceMotion = useReducedMotion();
    const Illustration = canLoadPredefined ? CurriculumImportIllustration : ProudTeacherIllustration;

    return (
        <section className="flex justify-center py-6 sm:py-10">
            <div className="w-full max-w-[460px]">
                {/* Surface principale */}
                <div className="flex flex-col items-center px-7 pt-7 pb-8 text-center sm:px-9 sm:pt-9 sm:pb-9">
                    {/* Illustration vectorielle vivante avec micro-mouvement de respiration */}
                    <Illustration size={152} className="mb-3" />

                    {/* Titre 21px bold */}
                    <h2 className="mt-2 text-[21px] font-bold tracking-tight text-foreground">
                        {t('emptyNotebook.label')}
                    </h2>

                    {/* Description 14.5px (uniquement si programme officiel disponible) */}
                    {canLoadPredefined && (
                        <p className="mt-2.5 max-w-[380px] text-[14.5px] font-normal leading-[1.65] text-muted-foreground">
                            {t('emptyNotebook.programAvailable')}
                        </p>
                    )}

                    {/* Boutons d'action avec physique de ressort (Spring physics) */}
                    <div className="mt-6 flex w-full flex-col gap-2.5">
                        {canLoadPredefined && (
                            <motion.button
                                type="button"
                                whileHover={reduceMotion ? undefined : { y: -2 }}
                                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                                onClick={onLoadPredefined}
                                className="flex h-12 w-full items-center justify-center rounded-xl bg-primary px-5 text-[14.5px] font-semibold text-primary-foreground shadow-xs transition-colors hover:brightness-110 active:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer"
                            >
                                {t('emptyNotebook.importProgram')}
                            </motion.button>
                        )}
                        <motion.button
                            type="button"
                            whileHover={reduceMotion ? undefined : { y: -2 }}
                            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                            onClick={() => onOpenAddContentModal()}
                            className={`flex h-12 w-full items-center justify-center rounded-xl text-[14.5px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer ${
                                canLoadPredefined
                                    ? 'border border-border bg-transparent text-foreground hover:bg-muted'
                                    : 'bg-primary text-primary-foreground hover:brightness-110 shadow-xs'
                            }`}
                        >
                            {t('emptyNotebook.createChapter')}
                        </motion.button>
                    </div>
                </div>

                {/* Surface secondaire : assistance WhatsApp */}
                <NotebookSupport
                    target={supportClass}
                    locale={locale}
                    hint={t('support.serviceHint')}
                    label={t('support.serviceWhatsApp')}
                />
            </div>
        </section>
    );
};

