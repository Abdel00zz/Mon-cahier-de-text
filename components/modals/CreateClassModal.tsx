import React, { useState, useEffect } from 'react';
import { Cycle, ClassInfo } from '../../types';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
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
  editingClass?: ClassInfo | null;
  onUpdate?: (classId: string, updates: Partial<ClassInfo>) => void;
}

const CYCLE_LABELS: Record<Cycle, string> = { college: 'Collège', lycee: 'Lycée', prepa: 'Classe préparatoire' };

const PREMIUM_COLORS = [
  '#C96442', // Terracotta (par défaut)
  '#E17649', // Clay
  '#B8935A', // Gold / Ochre
  '#2E7D32', // Forest Green
  '#0D9488', // Teal
  '#1565C0', // Cobalt Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Deep Purple
  '#ec4899', // Premium Pink
  '#455A64', // Elegant Slate
];

export const CreateClassModal: React.FC<CreateClassModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  defaultCycle = 'lycee',
  teacherSubjects = [],
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
  const [customColor, setCustomColor] = useState('#C96442');

  // Matières proposées : celles du prof en priorité, sinon la liste complète.
  const subjectOptions = teacherSubjects.length > 0 ? teacherSubjects : [...SUBJECTS];

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
        setCustomColor(editingClass.color || '#C96442');
      } else {
        setCycle(defaultCycle);
        const firstLevel = CLASS_LEVELS_BY_CYCLE[defaultCycle][0] ?? '';
        setLevel(firstLevel);
        setGroup('');
        setSubject(teacherSubjects[0] ?? '');
        setCustomMode(false);
        setCustomLevel('');
        setCustomSubject('');
        setCustomColor('#C96442');
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
          color: customColor,
        });
        onClose();
      } else {
        onCreate({ name: composedName, subject: effectiveSubject, cycle, color: customColor });
      }
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={editingClass ? "Configurer la classe" : "Créer une nouvelle classe"}
      description={editingClass ? "Modifiez les paramètres, la matière ou la couleur de la classe" : "Choisissez le niveau et la matière — le nom est composé automatiquement"}
      maxWidth="md"
      footer={
        <>
          <Button type="button" onClick={onClose} variant="secondary">
            Annuler
          </Button>
          <Button type="submit" form="create-class-form" variant="primary" disabled={!isFormValid}>
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

        {/* Personnalisation de la couleur de la carte et du fond */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Couleur de la classe
          </label>
          <div className="flex flex-wrap gap-2 py-1">
            {PREMIUM_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCustomColor(c)}
                className={`h-7 w-7 rounded-full border transition-all relative ${customColor === c ? 'scale-110 border-slate-700 shadow-md ring-2 ring-slate-300 ring-offset-1' : 'border-slate-200 hover:scale-105'}`}
                style={{ backgroundColor: c }}
                aria-label={`Couleur ${c}`}
              >
                {customColor === c && (
                  <span className="absolute inset-0 m-auto h-1.5 w-1.5 rounded-full bg-white shadow-sm" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Aperçu du nom composé */}
        {effectiveLevel && (
          <div className="rounded-xl border border-dashed border-border bg-slate-50 px-3 py-2 text-xs flex justify-between items-center">
            <div>
              <span className="font-semibold text-slate-400">Nom de la classe : </span>
              <span className="font-bold text-slate-700">{composedName}</span>
              {effectiveSubject && <span className="text-slate-400"> · {effectiveSubject}</span>}
            </div>
            {/* Visual indicator tag */}
            <span className="h-3 w-3 rounded-full border border-white shadow-sm shrink-0" style={{ backgroundColor: customColor }} />
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
