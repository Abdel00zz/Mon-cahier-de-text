import React, { useMemo } from 'react';
import { LessonsData } from '@/types';
import { computeProgressionStats } from '@/utils/progression';
import { Modal } from '@/components/ui/modal';
import { MathText } from '@/components/ui/math-text';
import { Button } from '@/components/ui/button';
import { PieChart } from '@/components/ui/icons';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonsData: LessonsData;
  getDateWarnings?: (date: string) => { type: string; message: string }[];
}

const getWarningItems = (lessons: LessonsData, getWarnings: (date: string) => any[]) => {
  const warningsList: Array<{ title: string; date: string; messages: string[] }> = [];
  
  const process = (item: any) => {
    if (!item) return;
    if (item.date && typeof item.date === 'string' && item.date.trim()) {
      const msgs = getWarnings(item.date).map(w => w.message);
      if (msgs.length > 0) {
        warningsList.push({
          title: item.title || item.name || 'Élément',
          date: item.date,
          messages: msgs
        });
      }
    }
    if (item.sections) item.sections.forEach(process);
    if (item.subsections) item.subsections.forEach(process);
    if (item.subsubsections) item.subsubsections.forEach(process);
    if (item.items) item.items.forEach(process);
  };
  
  lessons.forEach(process);
  return warningsList;
};

export const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose, lessonsData, getDateWarnings }) => {
  const stats = useMemo(() => computeProgressionStats(lessonsData), [lessonsData]);

  const warningItems = useMemo(() => {
    if (!getDateWarnings) return [];
    return getWarningItems(lessonsData, getDateWarnings);
  }, [lessonsData, getDateWarnings]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <PieChart className="h-4 w-4 text-primary" />
          Analyse & Progression
        </span>
      }
      maxWidth="2xl"
      footer={<Button type="button" variant="secondary" onClick={onClose}>Fermer</Button>}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-secondary/50 p-4 rounded-xl border border-border">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Complétion</div>
            <div className="text-3xl font-black text-primary">{stats.completionRate}%</div>
            <div className="text-[10px] text-muted-foreground/60 font-semibold mt-1">{stats.plannedCount} sur {stats.totalItems} éléments</div>
          </div>
          <div className="bg-secondary/50 p-4 rounded-xl border border-border">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Séances</div>
            <div className="text-3xl font-black text-primary">{stats.sessionsCount}</div>
            <div className="text-[10px] text-muted-foreground/60 font-semibold mt-1">Jours de cours distincts</div>
          </div>
          <div className="bg-secondary/50 p-4 rounded-xl border border-border">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">À planifier</div>
            <div className="text-3xl font-black text-primary">{stats.unplannedItems.length}</div>
            <div className="text-[10px] text-muted-foreground/60 font-semibold mt-1">Éléments sans date</div>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Progression par Chapitre</h3>
          <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-1">
            {stats.perChapter.map((chapter, i) => {
              if (chapter.total === 0) return null;
              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between items-end">
                    <div className="text-xs font-semibold text-foreground truncate pr-4">
                      <MathText source={chapter.title} cacheKey={`analysis-${chapter.title}`} inline>
                        {chapter.title}
                      </MathText>
                    </div>
                    <div className="text-xs font-bold text-muted-foreground whitespace-nowrap">{chapter.rate}%</div>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden border border-border/50">
                    <div
                      className="h-full bg-success rounded-full transition-all duration-500"
                      style={{ width: `${chapter.rate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {warningItems.length > 0 && (
          <div className="pt-2">
            <h3 className="text-xs font-bold text-warning uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-destructive animate-ping" />
              Repères de calendrier à vérifier ({warningItems.length})
            </h3>
            <div className="space-y-2 max-h-[25vh] overflow-y-auto pr-1">
              {warningItems.map((item, idx) => (
                <div key={idx} className="bg-warning/10 p-3 rounded-xl border border-warning/20 text-xs flex flex-col gap-1">
                  <div className="flex justify-between items-center font-bold text-foreground">
                    <span className="truncate pr-2">
                      <MathText source={item.title} cacheKey={`warn-${item.title}`} inline>{item.title}</MathText>
                    </span>
                    <span className="font-mono text-[10px] text-destructive bg-card px-2 py-0.5 rounded-full border border-destructive/10 shrink-0">
                      {item.date.split('-').reverse().join('/')}
                    </span>
                  </div>
                  <div className="space-y-0.5 mt-0.5">
                    {item.messages.map((m, i) => (
                      <p key={i} className="text-muted-foreground/90 pl-2 border-l border-destructive/30">
                        ⚠ {m}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
