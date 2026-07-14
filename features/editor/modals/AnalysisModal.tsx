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
          <PieChart className="h-4 w-4 text-zinc-700" />
          Analyse & Progression
        </span>
      }
      maxWidth="2xl"
      footer={<Button type="button" variant="secondary" onClick={onClose} className="rounded-xl">Fermer</Button>}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Complétion</div>
            <div className="text-2xl font-black text-zinc-800">{stats.completionRate}%</div>
            <div className="text-[10px] text-zinc-500 font-semibold mt-1">{stats.plannedCount} sur {stats.totalItems} éléments</div>
          </div>
          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Séances</div>
            <div className="text-2xl font-black text-zinc-800">{stats.sessionsCount}</div>
            <div className="text-[10px] text-zinc-500 font-semibold mt-1">Jours de cours distincts</div>
          </div>
          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">À planifier</div>
            <div className="text-2xl font-black text-zinc-800">{stats.unplannedItems.length}</div>
            <div className="text-[10px] text-zinc-500 font-semibold mt-1">Éléments sans date</div>
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-3">Progression par Chapitre</h3>
          <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-1">
            {stats.perChapter.map((chapter, i) => {
              if (chapter.total === 0) return null;
              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between items-end">
                    <div className="text-xs font-semibold text-zinc-800 truncate pr-4">
                      <MathText source={chapter.title} cacheKey={`analysis-${chapter.title}`} inline>
                        {chapter.title}
                      </MathText>
                    </div>
                    <div className="text-xs font-bold text-zinc-500 whitespace-nowrap">{chapter.rate}%</div>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/50">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                      style={{ width: `${chapter.rate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {warningItems.length > 0 && (
          <div className="pt-2 border-t border-zinc-100">
            <h3 className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Repères de calendrier à vérifier ({warningItems.length})
            </h3>
            <div className="space-y-2 max-h-[25vh] overflow-y-auto pr-1">
              {warningItems.map((item, idx) => (
                <div key={idx} className="bg-amber-50/50 p-3 rounded-xl border border-amber-200 text-xs flex flex-col gap-1">
                  <div className="flex justify-between items-center font-bold text-zinc-800">
                    <span className="truncate pr-2">
                      <MathText source={item.title} cacheKey={`warn-${item.title}`} inline>{item.title}</MathText>
                    </span>
                    <span className="font-mono text-[10px] text-amber-800 bg-white px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                      {item.date.split('-').reverse().join('/')}
                    </span>
                  </div>
                  <div className="space-y-0.5 mt-0.5">
                    {item.messages.map((m, i) => (
                      <p key={i} className="text-zinc-600 pl-2 border-l border-amber-300">
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
