import React, { useMemo } from 'react';
import { LessonsData } from '../../types';
import { computeProgressionStats } from '../../utils/progression';
import { Dialog } from '../ui/dialog';
import { PieChart } from '../ui/icons';

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
          <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-1">
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

        {warningItems.length > 0 && (
          <div className="border-t border-[#E4D3AC]/40 pt-4">
            <h3 className="text-xs font-bold text-[#C96442] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#C96442] animate-ping" />
              Alertes de Calendrier & Dates Insolites ({warningItems.length})
            </h3>
            <div className="space-y-2 max-h-[25vh] overflow-y-auto pr-1">
              {warningItems.map((item, idx) => (
                <div key={idx} className="bg-[#FDF2ED] p-3 rounded-xl border border-[#C96442]/20 text-xs flex flex-col gap-1">
                  <div className="flex justify-between items-center font-bold text-[#2B241D]">
                    <span className="truncate pr-2">{item.title}</span>
                    <span className="font-mono text-[10px] text-[#C96442] bg-white px-2 py-0.5 rounded-full border border-[#C96442]/10 shrink-0">
                      {item.date.split('-').reverse().join('/')}
                    </span>
                  </div>
                  <div className="space-y-0.5 mt-0.5">
                    {item.messages.map((m, i) => (
                      <p key={i} className="text-[#69604F]/90 pl-2 border-l border-[#C96442]/30">
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
    </Dialog>
  );
};

