import React, { useState, useRef, useEffect } from 'react';
import { AppConfig, TopLevelItem } from '@/types';
import { Modal } from '@/components/ui/modal';
import { TriangleAlert, Trash2, GripVertical, ArrowUp, ArrowDown, FolderOpen } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { MathText } from '@/components/ui/math-text';
import { TOP_LEVEL_TYPE_CONFIG } from '@/constants';
import { DescriptionVisibilityControl, DescriptionMode } from '@/features/settings/components/DescriptionVisibilityControl';

interface ManageLessonsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (lessons: TopLevelItem[]) => void;
  lessons: TopLevelItem[];
  config: AppConfig;
  onConfigChange: (patch: Partial<AppConfig>) => void;
}

export const ManageLessonsModal: React.FC<ManageLessonsModalProps> = ({ isOpen, onClose, onUpdate, lessons, config, onConfigChange }) => {
  const [localLessons, setLocalLessons] = useState<TopLevelItem[]>([]);
  const [localDesc, setLocalDesc] = useState<{ mode: DescriptionMode; types: string[] }>({ mode: 'all', types: [] });
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalLessons([...lessons]);
      setLocalDesc({
        mode: config.screenDescriptionMode ?? 'all',
        types: config.screenDescriptionTypes ?? [],
      });
    }
  }, [isOpen, lessons, config.screenDescriptionMode, config.screenDescriptionTypes]);

  const handleDelete = (index: number) => {
    setLocalLessons(current => current.filter((_, i) => i !== index));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setLocalLessons(current => {
      const copy = [...current];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  const moveDown = (index: number) => {
    if (index === localLessons.length - 1) return;
    setLocalLessons(current => {
      const copy = [...current];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, index: number) => {
    dragItem.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
    const newList = [...localLessons];
    if (dragItem.current === null) return;
    const draggedItemContent = newList.splice(dragItem.current, 1)[0];
    newList.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = dragOverItem.current;
    setLocalLessons(newList);
  };
  
  const handleDragEnd = () => {
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleSubmit = () => {
    onConfigChange({ screenDescriptionMode: localDesc.mode, screenDescriptionTypes: localDesc.types });
    onUpdate(localLessons);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gérer les chapitres & devoirs"
      description="Réorganisez vos contenus principaux ou supprimez-les. Utilisez les flèches sur mobile ou le glisser-déposer."
      maxWidth="xl"
      footer={
        <>
          <Button type="button" onClick={onClose} variant="secondary" className="rounded-xl">
            Annuler
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit} 
            className="rounded-xl bg-primary hover:bg-primary/90 font-semibold px-5 shadow-sm"
          >
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <DescriptionVisibilityControl
          context="screen"
          mode={localDesc.mode}
          types={localDesc.types}
          onChange={setLocalDesc}
        />

        {localLessons.length > 0 ? (
          <ul className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {localLessons.map((item, index) => {
              const config = TOP_LEVEL_TYPE_CONFIG[item.type];

              // Defensive check for corrupted data
              if (!config) {
                return (
                  <li 
                    key={index} 
                    className="flex items-center gap-3 p-3 rounded-xl bg-rose-50 border border-rose-200"
                  >
                    <TriangleAlert className="mr-2 h-4 w-4 flex-shrink-0 text-rose-600" />
                    <span className="flex-grow text-rose-800 text-xs font-semibold truncate">Contenu corrompu: "{item.title}"</span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(index)}
                      className="w-7 h-7 p-0 flex items-center justify-center rounded-lg"
                      title="Supprimer cet élément corrompu"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </li>
                );
              }

              return (
                <li 
                  key={index} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white border border-zinc-200 cursor-grab active:cursor-grabbing hover:bg-zinc-50 hover:border-zinc-300 transition-all duration-150 select-none shadow-xs"
                >
                  {/* Left drag handle and title */}
                  <div className="flex items-center min-w-0 flex-1 gap-2.5">
                    <div className="hidden sm:flex items-center text-zinc-400 cursor-grab px-1 py-1 hover:text-zinc-600">
                      <GripVertical className="h-3 w-3" />
                    </div>
                    <div className="p-1.5 bg-zinc-50 border border-zinc-100 rounded-lg flex-shrink-0 flex items-center justify-center w-8 h-8">
                      <config.icon className={`${config.color} h-4 w-4`} />
                    </div>
                    <span className="flex-grow text-zinc-800 text-xs font-semibold truncate pr-1">
                      <MathText source={item.title} cacheKey={`manage-${item.title}`} inline>
                        {item.title || 'Sans titre'}
                      </MathText>
                    </span>
                  </div>

                  {/* Right actions: Reorder buttons & delete */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Up button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={index === 0}
                      onClick={() => moveUp(index)}
                      className="h-8 w-8 p-0 flex items-center justify-center rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-30 disabled:hover:bg-white"
                      title="Monter"
                    >
                      <ArrowUp className="h-3.5 w-3.5 text-zinc-500" />
                    </Button>

                    {/* Down button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={index === localLessons.length - 1}
                      onClick={() => moveDown(index)}
                      className="h-8 w-8 p-0 flex items-center justify-center rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-30 disabled:hover:bg-white"
                      title="Descendre"
                    >
                      <ArrowDown className="h-3.5 w-3.5 text-zinc-500" />
                    </Button>

                    <div className="h-4 w-[1px] bg-zinc-200 mx-0.5"></div>

                    {/* Delete button */}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleDelete(index)}
                      className="h-8 w-8 p-0 flex items-center justify-center rounded-lg bg-white hover:bg-rose-50 border border-zinc-200 hover:border-rose-200 hover:text-rose-600 text-zinc-400 transition-colors duration-150 shadow-xs cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center text-zinc-500 font-medium italic py-12 bg-zinc-50 border border-dashed border-zinc-200 rounded-xl">
            <FolderOpen className="mx-auto mb-2 h-5 w-5 text-zinc-400" />
            Aucun contenu principal à organiser.
          </div>
        )}
      </div>
    </Modal>
  );
};
