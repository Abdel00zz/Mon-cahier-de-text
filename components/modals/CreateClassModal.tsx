import React, { useState, useEffect } from 'react';
import { Cycle, ClassInfo } from '../../types';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Plus, Settings } from '../ui/icons';
import { CLASS_LEVELS_BY_CYCLE, SUBJECTS } from '../../constants';

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (details: { name: string; subject: string; cycle?: Cycle; color?: string; }) => void;
  defaultTeacherName?: string;
  /** cycle actif du tableau de bord — pré-sélectionné */
  defaultCycle?: Cycle;
  /** matières de l'enseignant (choisies à l'inscription) — filtrent le choix */
  teacherSubjects?: string[];
  /**
   * cycles de l'enseignant (choisis à l'inscription, modifiables dans les
   * Paramètres) — un seul cycle : le champ disparaît, il est hérité ;
   * plusieurs : le choix est restreint à ces cycles
   */
  teacherCycles?: Cycle[];
  editingClass?: ClassInfo | null;
  onUpdate?: (classId: string, updates: Partial<ClassInfo>) => void;
}

const CYCLE_LABELS: Record<Cycle, string> = { college: 'Collège', lycee: 'Lycée', prepa: 'Classe préparatoire' };

export const CreateClassModal: React.FC<CreateClassModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  defaultCycle = 'lycee',
  teacherSubjects = [],
  teacherCycles = [],
  editingClass = null,
  onUpdate,
}) => {
  const [cycle, setCycle] = useState<Cycle>(defaultCycle);
  const [level, setLevel] = useState('');
  const [group, setGroup] = useState('');
  const [subject, setSubject] = useState('');
  // Mode « personnalisé » : niveau libre pour les cas rares hors liste officielle.
  const [customMode, setCustomMode] = useState(false);
  const [customLevel, setCustomLevel] = useState('');
  const [customSubject, setCustomSubject] = useState('');

  /*
   * Héritage du profil d'inscription (modifiable dans les Paramètres) :
   * — une seule matière / un seul cycle → champ masqué, valeur héritée ;
   * — plusieurs → choix restreint aux valeurs du prof.
   * En édition, la valeur actuelle de la classe reste toujours proposée
   * (même si le prof a depuis retiré ce cycle/cette matière de son profil).
   */
  const subjectOptions = React.useMemo(() => {
    const base = teacherSubjects.length > 0 ? [...teacherSubjects] : [...SUBJECTS];
    if (editingClass?.subject && !base.includes(editingClass.subject)) base.unshift(editingClass.subject);
    return base;
  }, [teacherSubjects, editingClass]);

  const cycleOptions = React.useMemo(() => {
    const base: Cycle[] = teacherCycles.length > 0 ? [...teacherCycles] : (Object.keys(CYCLE_LABELS) as Cycle[]);
    if (editingClass?.cycle && !base.includes(editingClass.cycle)) base.unshift(editingClass.cycle);
    return base;
  }, [teacherCycles, editingClass]);

  const singleSubject = !editingClass && subjectOptions.length === 1 && teacherSubjects.length === 1;
  const singleCycle = !editingClass && cycleOptions.length === 1 && teacherCycles.length === 1;

  useEffect(() => {
    if (isOpen) {
      if (editingClass) {
        const classCycle = editingClass.cycle || 'lycee';
        setCycle(classCycle);
        const classLevels = CLASS_LEVELS_BY_CYCLE[classCycle] || [];
        const matchedLevel = classLevels.find(l => editingClass.name.startsWith(l));
        
        if (matchedLevel) {
          setCustomMode(false);
          setLevel(matchedLevel);
          setGroup(editingClass.name.slice(matchedLevel.length).trim());
        } else {
          setCustomMode(true);
          setCustomLevel(editingClass.name);
          setGroup('');
        }
        setSubject(editingClass.subject || '');
        setCustomSubject(editingClass.subject || '');
      } else {
        // cycle initial : celui du tableau de bord s'il appartient au profil,
        // sinon le premier cycle du prof
        const initialCycle: Cycle =
          teacherCycles.length === 0 || teacherCycles.includes(defaultCycle)
            ? defaultCycle
            : teacherCycles[0];
        setCycle(initialCycle);
        const firstLevel = CLASS_LEVELS_BY_CYCLE[initialCycle][0] ?? '';
        setLevel(firstLevel);
        setGroup('');
        setSubject(teacherSubjects[0] ?? '');
        setCustomMode(false);
        setCustomLevel('');
        setCustomSubject('');
      }
    }
  }, [isOpen, defaultCycle, teacherSubjects, editingClass]);

  const levels = CLASS_LEVELS_BY_CYCLE[cycle] || [];
  const effectiveLevel = customMode ? customLevel.trim() : level;
  const effectiveSubject = customMode ? customSubject.trim() : subject;
  const composedName = `${effectiveLevel}${group.trim() ? ` ${group.trim()}` : ''}`.trim();
  const isFormValid = !!effectiveLevel && !!effectiveSubject;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid) {
      if (editingClass && onUpdate) {
        onUpdate(editingClass.id, {
          name: composedName,
          subject: effectiveSubject,
          cycle,
          color: '',
        });
        onClose();
      } else {
        onCreate({ name: composedName, subject: effectiveSubject, cycle });
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingClass ? "Configurer la classe" : "Créer une nouvelle classe"}
      description={editingClass ? "Modifiez les paramètres et la matière de la classe" : "Choisissez le niveau et la matière — le nom est composé automatiquement"}
      maxWidth="md"
      footer={
        <>
          <Button type="button" onClick={onClose} variant="secondary">
            Annuler
          </Button>
          <Button type="submit" form="create-class-form" variant="default" disabled={!isFormValid}>
            {editingClass ? (
              <>
                <Settings className="mr-2 h-3.5 w-3.5" /> Enregistrer les modifications
              </>
            ) : (
              <>
                <Plus className="mr-2 h-3.5 w-3.5" /> Créer la classe
              </>
            )}
          </Button>
        </>
      }
    >
      <form id="create-class-form" onSubmit={handleSubmit} className="space-y-4 py-1">
        {/* Cycle : masqué si le prof n'enseigne qu'un cycle (hérité du profil) */}
        {!singleCycle && (
          <div className="space-y-1.5">
            <label htmlFor="cycle" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cycle *
            </label>
            <Select
              value={cycle}
              onValueChange={(value) => {
                const nextCycle = value as Cycle;
                setCycle(nextCycle);
                setLevel(CLASS_LEVELS_BY_CYCLE[nextCycle][0] ?? '');
              }}
            >
              <SelectTrigger id="cycle">
                <SelectValue placeholder="Choisir un cycle..." />
              </SelectTrigger>
              <SelectContent>
                {cycleOptions.map(c => (
                  <SelectItem key={c} value={c}>{CYCLE_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div className="space-y-1.5">
            <label htmlFor="level" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Niveau / Classe *
            </label>
            {customMode ? (
              <Input
                id="level"
                type="text"
                value={customLevel}
                onChange={(e) => setCustomLevel(e.target.value)}
                placeholder="Ex : Groupe soutien, DAOL…"
                required
              />
            ) : (
              <Select value={level} onValueChange={setLevel} required>
                <SelectTrigger id="level">
                  <SelectValue placeholder="Choisir un niveau..." />
                </SelectTrigger>
                <SelectContent>
                  {levels.map(l => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="group" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Groupe
            </label>
            <Input
              id="group"
              type="text"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              placeholder="1, 2, A…"
              className="w-24 text-center"
              maxLength={4}
            />
          </div>
        </div>

        {/* Matière : masquée si le prof n'en enseigne qu'une (héritée du profil) */}
        {!(singleSubject && !customMode) && (
          <div className="space-y-1.5">
            <label htmlFor="subject" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Matière *
            </label>
            {customMode ? (
              <Input
                id="subject"
                type="text"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                placeholder="Saisir une matière…"
                required
              />
            ) : (
              <Select value={subject} onValueChange={setSubject} required>
                <SelectTrigger id="subject">
                  <SelectValue placeholder="Choisir une matière…" />
                </SelectTrigger>
                <SelectContent>
                  {subjectOptions.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Aperçu du nom composé */}
        {effectiveLevel && (
          <div className="rounded-xl border border-dashed border-border bg-secondary/50 px-3 py-2 text-xs flex justify-between items-center">
            <div>
              <span className="font-semibold text-muted-foreground/60">Nom de la classe : </span>
              <span className="font-bold text-foreground/80">{composedName}</span>
              {effectiveSubject && <span className="text-muted-foreground/60"> · {effectiveSubject}</span>}
            </div>
            <span className="h-3 w-3 rounded-full border border-primary/30 bg-primary/15 shadow-sm shrink-0" />
          </div>
        )}

        {/* Échappatoire discrète : niveau personnalisé (choix rare) */}
        <button
          type="button"
          onClick={() => setCustomMode(v => !v)}
          className="text-[11px] font-medium text-muted-foreground/60 underline-offset-2 transition-colors hover:text-primary hover:underline"
        >
          {customMode
            ? '← Revenir à la liste officielle'
            : 'Niveau non listé ? Créer une classe personnalisée'}
        </button>
      </form>
    </Modal>
  );
};
