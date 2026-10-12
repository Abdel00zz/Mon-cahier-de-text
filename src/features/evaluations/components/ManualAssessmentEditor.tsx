import React, { useState } from 'react';
import type { Cycle, DevoirType, ManualAssessment } from '@/types';
import { isKindOffered } from '@/domain/evaluations/kindAvailability';
import { schoolYearLabelFromDate } from '@/domain/calendar/calendar';
import { nextAssessmentNumber } from '@/domain/evaluations/assessments';
import { useLocale } from '@/i18n/LocaleProvider';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

/*
 * FORMULAIRE D'UN DEVOIR MANUEL.
 *
 * Réutilisé DEUX fois : à la création (depuis l'assistant, `initialType` seul)
 * et à l'édition (depuis la ligne, `initial` complet). L'identité annuelle est
 * posée à la soumission (`schoolYearLabelFromDate`) ; changer la nature
 * renumérote le numéro suivant de la famille choisie, jamais un doublon.
 */
interface ManualAssessmentEditorProps {
  homeworkDate?: string;
  today: string;
  initial?: ManualAssessment | null;
  initialType?: DevoirType;
  assessments?: { id: string; type: DevoirType; num?: number; semestre?: 1 | 2 }[];
  /** Cycle de la classe : la colle n'est proposée qu'en prépa (une colle existante reste modifiable). */
  cycle?: Cycle;
  onCancel: () => void;
  onSave: (manual: ManualAssessment) => void;
}

/** Semestre d'une date : février à juillet = semestre 2 (même règle que l'identité annuelle des devoirs). */
const semesterOfDate = (iso: string): 1 | 2 | null => {
  const month = Number(iso.slice(5, 7));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || !month) return null;
  return month >= 2 && month <= 7 ? 2 : 1;
};

export const ManualAssessmentEditor: React.FC<ManualAssessmentEditorProps> = ({ today, homeworkDate, initial, initialType, assessments = [], cycle, onCancel, onSave }) => {
  const { t } = useLocale();
  const initialKind: DevoirType = initial?.type ?? initialType ?? 'controle';
  // La numérotation officielle repart à 1 à chaque semestre : le suivant se calcule DANS le semestre.
  const inSemester = (semester: 1 | 2) => assessments.filter(item => item.semestre === undefined || item.semestre === semester);
  const nextNumFor = (nextType: DevoirType, semester: 1 | 2): number => nextAssessmentNumber(inSemester(semester), nextType, initial?.id);
  const [type, setType] = useState<DevoirType>(initialKind);
  const initialSemester: 1 | 2 = initial?.semestre ?? semesterOfDate(initial?.dateISO ?? (initialKind === 'maison' && homeworkDate ? homeworkDate : today)) ?? 1;
  const [num, setNum] = useState(String(initial?.num ?? nextNumFor(initialKind, initialSemester)));
  const [date, setDate] = useState(initial?.dateISO ?? (initialKind === 'maison' && homeworkDate ? homeworkDate : today));
  const [duree, setDuree] = useState(initial?.duree ?? '');
  const [semestre, setSemestre] = useState<1 | 2>(initialSemester);
  /** Un semestre choisi à la main n'est plus recalculé depuis la date. */
  const [semesterTouched, setSemesterTouched] = useState(false);
  const [error, setError] = useState('');

  const changeType = (nextType: DevoirType) => {
    setType(nextType);
    if (!initial && nextType === 'maison' && homeworkDate) setDate(homeworkDate);
    setNum(String(nextNumFor(nextType, semestre)));
  };

  const submit = () => {
    const numValue = parseInt(num, 10);
    if (!numValue || numValue < 1) {
      setError(t('evaluations.manualNumRequired'));
      return;
    }
    if (!date) {
      setError(t('evaluations.startDateRequired'));
      return;
    }
    // Deux « Devoir surveillé 2 » au même semestre se confondraient avec leur bloc du cahier.
    if (assessments.some(item => item.id !== initial?.id && item.type === type && item.num === numValue && item.semestre === semestre)) {
      setError(t('evaluations.manualNumTaken', { type: t(`evaluations.type.${type}`), num: numValue, semester: semestre }));
      return;
    }
    onSave({
      id: initial?.id ?? (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `dev-${Date.now()}`),
      schoolYear: schoolYearLabelFromDate(date),
      type,
      num: numValue,
      dateISO: date,
      duree: duree.trim() || undefined,
      semestre,
    });
  };

  return (
    <div className="space-y-3.5 sm:space-y-4 font-sans">
      <div className="space-y-3 sm:space-y-3.5">
        <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
          {initial ? (
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-foreground">{t('evaluations.manualType')}</span>
              <Select value={type} onValueChange={(value) => changeType(value as DevoirType)}>
                <SelectTrigger aria-label={t('evaluations.manualType')} className="min-h-11 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['controle', 'controle_court', 'controle_global', 'oral', 'maison', 'colle'] as const)
                    .filter(value => value === initialKind || isKindOffered(value, { cycle })).map(value => (
                    <SelectItem key={value} value={value}>{t(`evaluations.type.${value}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          ) : (
            <div className="flex flex-col justify-end gap-1 rounded-xl bg-muted/40 px-3 py-2">
              <span className="text-xs font-bold text-foreground">{t('evaluations.manualType')}</span>
              <span className="truncate text-xs font-semibold text-muted-foreground">{t(`evaluations.type.${type}`)}</span>
            </div>
          )}
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground">{t('evaluations.manualSemester')}</span>
            <Select value={String(semestre)} onValueChange={(value) => { setSemestre(Number(value) as 1 | 2); setSemesterTouched(true); setError(''); }}>
              <SelectTrigger aria-label={t('evaluations.manualSemester')} className="min-h-11 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">{t('evaluations.semester', { number: 1 })}</SelectItem>
                <SelectItem value="2">{t('evaluations.semester', { number: 2 })}</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground">{t('evaluations.manualNum')}</span>
            <input
              type="number"
              min={1}
              value={num}
              onChange={(event) => {
                setNum(event.target.value);
                setError('');
              }}
              className="h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
              inputMode="numeric"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground">{t('evaluations.manualDate')}</span>
            <input
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                const derived = semesterOfDate(event.target.value);
                if (derived && !semesterTouched) setSemestre(derived);
                setError('');
              }}
              className="h-10 w-full min-w-0 rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-foreground">
            {t('evaluations.manualDuree')} <span className="font-normal text-muted-foreground">({t('evaluations.optional')})</span>
          </span>
          <input
            value={duree}
            onChange={(event) => setDuree(event.target.value)}
            placeholder="1h, 2h…"
            className="h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>

        {error && (
          <div role="alert" className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs font-semibold text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-3 sm:flex sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-xl bg-muted px-4 py-2 text-xs font-bold text-muted-foreground transition-all hover:bg-accent hover:text-foreground cursor-pointer"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={submit}
            className="min-h-11 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-xs transition-all hover:brightness-110 cursor-pointer"
          >
            {t(initial ? 'evaluations.saveAssessment' : 'evaluations.addDevoir')}
          </button>
        </div>
      </div>
    </div>
  );
};
