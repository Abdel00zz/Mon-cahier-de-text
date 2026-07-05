import React, { useState, useEffect } from 'react';
import { Cycle } from '../../types';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Plus } from '../ui/icons';
import { CLASS_LEVELS_BY_CYCLE, SUBJECTS } from '../../constants';

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (details: { name: string; subject: string; cycle?: Cycle; }) => void;
  defaultTeacherName?: string;
  /** cycle actif du tableau de bord — pré-sélectionné */
  defaultCycle?: Cycle;
  /** matières de l'enseignant (choisies à l'inscription) — filtrent le choix */
  teacherSubjects?: string[];
}

const CYCLE_LABELS: Record<Cycle, string> = { college: 'Collège', lycee: 'Lycée', prepa: 'Classe préparatoire' };

export const CreateClassModal: React.FC<CreateClassModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  defaultCycle = 'lycee',
  teacherSubjects = [],
}) => {
  const [cycle, setCycle] = useState<Cycle>(defaultCycle);
  const [level, setLevel] = useState('');
  const [group, setGroup] = useState('');
  const [subject, setSubject] = useState('');
  // Mode « personnalisé » : niveau libre pour les cas rares hors liste officielle.
  const [customMode, setCustomMode] = useState(false);
  const [customLevel, setCustomLevel] = useState('');
  const [customSubject, setCustomSubject] = useState('');

  // Matières proposées : celles du prof en priorité, sinon la liste complète.
  const subjectOptions = teacherSubjects.length > 0 ? teacherSubjects : [...SUBJECTS];

  useEffect(() => {
    if (isOpen) {
      setCycle(defaultCycle);
      const firstLevel = CLASS_LEVELS_BY_CYCLE[defaultCycle][0] ?? '';
      setLevel(firstLevel);
      setGroup('');
      setSubject(teacherSubjects[0] ?? '');
      setCustomMode(false);
      setCustomLevel('');
      setCustomSubject('');
    }
  }, [isOpen, defaultCycle, teacherSubjects]);

  const levels = CLASS_LEVELS_BY_CYCLE[cycle];
  const effectiveLevel = customMode ? customLevel.trim() : level;
  const effectiveSubject = customMode ? customSubject.trim() : subject;
  const composedName = `${effectiveLevel}${group.trim() ? ` ${group.trim()}` : ''}`.trim();
  const isFormValid = !!effectiveLevel && !!effectiveSubject;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid) {
      onCreate({ name: composedName, subject: effectiveSubject, cycle });
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Créer une nouvelle classe"
      description="Choisissez le niveau et la matière — le nom est composé automatiquement"
      maxWidth="md"
      footer={
        <>
          <Button type="button" onClick={onClose} variant="secondary">
            Annuler
          </Button>
          <Button type="submit" form="create-class-form" variant="primary" disabled={!isFormValid}>
            <Plus className="mr-2 h-3.5 w-3.5" /> Créer la classe
          </Button>
        </>
      }
    >
      <form id="create-class-form" onSubmit={handleSubmit} className="space-y-4 py-1">
        <div className="space-y-1.5">
          <label htmlFor="cycle" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Cycle *
          </label>
          <Select
            id="cycle"
            value={cycle}
            onChange={(e) => {
              const nextCycle = e.target.value as Cycle;
              setCycle(nextCycle);
              setLevel(CLASS_LEVELS_BY_CYCLE[nextCycle][0] ?? '');
            }}
          >
            {(Object.keys(CYCLE_LABELS) as Cycle[]).map(c => (
              <option key={c} value={c}>{CYCLE_LABELS[c]}</option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div className="space-y-1.5">
            <label htmlFor="level" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
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
              <Select id="level" value={level} onChange={(e) => setLevel(e.target.value)} required>
                {levels.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </Select>
            )}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="group" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
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

        <div className="space-y-1.5">
          <label htmlFor="subject" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
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
            <Select id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required>
              <option value="" disabled>Choisir une matière…</option>
              {subjectOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          )}
        </div>

        {/* Aperçu du nom composé */}
        {effectiveLevel && (
          <div className="rounded-xl border border-dashed border-border bg-slate-50 px-3 py-2 text-xs">
            <span className="font-semibold text-slate-400">Nom de la classe : </span>
            <span className="font-bold text-slate-700">{composedName}</span>
            {effectiveSubject && <span className="text-slate-400"> · {effectiveSubject}</span>}
          </div>
        )}

        {/* Échappatoire discrète : niveau personnalisé (choix rare) */}
        <button
          type="button"
          onClick={() => setCustomMode(v => !v)}
          className="text-[11px] font-medium text-slate-400 underline-offset-2 transition-colors hover:text-primary hover:underline"
        >
          {customMode
            ? '← Revenir à la liste officielle'
            : 'Niveau non listé ? Créer une classe personnalisée'}
        </button>
      </form>
    </Dialog>
  );
};
