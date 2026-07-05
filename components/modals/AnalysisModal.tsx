import React, { useMemo } from 'react';
import { LessonsData } from '../../types';
import { computeProgressionStats } from '../../utils/progression';
import { Dialog } from '../ui/dialog';
import { PieChart } from '../ui/icons';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonsData: LessonsData;
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose, lessonsData }) => {
  const stats = useMemo(() => computeProgressionStats(lessonsData), [lessonsData]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <PieChart className="h-4 w-4 text-primary" />
          Analyse & Progression
        </span>
      }
      maxWidth="2xl"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-border">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Complétion</div>
            <div className="text-3xl font-black text-primary">{stats.completionRate}%</div>
            <div className="text-[10px] text-slate-400 font-semibold mt-1">{stats.plannedCount} sur {stats.totalItems} éléments</div>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-border">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Séances</div>
            <div className="text-3xl font-black text-primary">{stats.sessionsCount}</div>
            <div className="text-[10px] text-slate-400 font-semibold mt-1">Jours de cours distincts</div>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-border">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">À planifier</div>
            <div className="text-3xl font-black text-primary">{stats.unplannedItems.length}</div>
            <div className="text-[10px] text-slate-400 font-semibold mt-1">Éléments sans date</div>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Progression par Chapitre</h3>
          <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
            {stats.perChapter.map((chapter, i) => {
              if (chapter.total === 0) return null;
              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between items-end">
                    <div className="text-xs font-semibold text-slate-800 truncate pr-4">
                      {chapter.title}
                    </div>
                    <div className="text-xs font-bold text-slate-500 whitespace-nowrap">{chapter.rate}%</div>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-border/50">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${chapter.rate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Dialog>
  );
};
