import React, { useState, useEffect, useRef, FC } from 'react';
import { AppConfig, Cycle } from '../../types';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { School, GraduationCap, FlaskConical, ArrowRight } from '../ui/icons';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onConfigChange: (newConfig: Partial<AppConfig>) => void;
}

const CYCLES: { key: Cycle; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'college', label: 'Collège',  icon: School         },
  { key: 'lycee',   label: 'Lycée',    icon: GraduationCap  },
  { key: 'prepa',   label: 'Prépa',    icon: FlaskConical   },
];

export const WelcomeModal: FC<WelcomeModalProps> = ({ isOpen, onClose, config, onConfigChange }) => {
  const [establishment, setEstablishment] = useState('');
  const [teacherName,   setTeacherName]   = useState('');
  const [cycle,         setCycle]         = useState<Cycle>('college');
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setEstablishment(config.establishmentName  || '');
    setTeacherName  (config.defaultTeacherName || '');
    setCycle        ((config.selectedCycles?.[0] as Cycle) || 'college');
    setTimeout(() => firstInputRef.current?.focus(), 80);
  }, [isOpen]);

  const canFinish =
    establishment.trim().length > 0 &&
    teacherName.trim().length   > 0;

  const handleFinish = () => {
    if (!canFinish) return;
    onConfigChange({
      establishmentName:  establishment.trim(),
      defaultTeacherName: teacherName.trim(),
      selectedCycles:     [cycle],
      showAllCycles:      false,
      hasCompletedWelcome: true,
    });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canFinish) handleFinish();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configuration Initiale"
      description="Personnalisez votre cahier de textes interactif en quelques secondes"
      maxWidth="md"
      footer={
        <div className="w-full space-y-3">
          <Button
            type="button"
            onClick={handleFinish}
            disabled={!canFinish}
            className={`w-full py-2.5 h-11 rounded-full text-xs font-bold transition-all duration-150 ${
              canFinish
                ? 'bg-primary hover:bg-primary/95 text-white shadow-md'
                : 'bg-muted text-muted-foreground/60 cursor-not-allowed border-transparent'
            }`}
          >
            Découvrir l'espace
          </Button>
          <p className="text-center text-[10px] text-muted-foreground/80 font-semibold font-sans">
            Ces informations sont stockées localement sur votre navigateur.
          </p>
        </div>
      }
    >
      <div onKeyDown={handleKeyDown} className="space-y-4 py-1">
        {/* Établissement */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider font-mono">
            Établissement d'enseignement
          </label>
          <Input
            ref={firstInputRef}
            type="text"
            value={establishment}
            onChange={e => setEstablishment(e.target.value)}
            placeholder="Ex : Lycée Ibn al-Haytham"
            className="w-full text-xs font-semibold rounded-2xl border-border bg-secondary/30 hover:bg-secondary/60 focus:bg-card transition-all h-10"
            required
          />
        </div>

        {/* Nom */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider font-mono">
            Nom de l'enseignant (M. ou Mme)
          </label>
          <Input
            type="text"
            value={teacherName}
            onChange={e => setTeacherName(e.target.value)}
            placeholder="Ex : M. Ahmed Benali"
            className="w-full text-xs font-semibold rounded-2xl border-border bg-secondary/30 hover:bg-secondary/60 focus:bg-card transition-all h-10"
            required
          />
        </div>

        {/* Cycle */}
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider font-mono">
            Niveau ou cycle d'enseignement principal
          </label>
          <div className="grid grid-cols-3 gap-2">
            {CYCLES.map(c => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCycle(c.key)}
                className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl border text-[11px] font-bold transition-all duration-150 cursor-pointer ${
                  cycle === c.key
                    ? 'bg-primary/10 text-primary border-primary/30 shadow-sm'
                    : 'bg-secondary/30 text-muted-foreground border-border/60 hover:border-border hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                <c.icon className="h-4 w-4" />
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
