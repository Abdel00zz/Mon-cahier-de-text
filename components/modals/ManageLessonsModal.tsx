import React, { useState, useRef, useEffect } from 'react';
import { AppConfig, TopLevelItem } from '../../types';
import { Modal } from '../ui/modal';
import { Check, TriangleAlert, Trash2, GripVertical, ArrowUp, ArrowDown, FolderOpen } from '../ui/icons';
import { Button } from '../ui/button';
import { MathText } from '../ui/math-text';
import { TOP_LEVEL_TYPE_CONFIG } from '../../constants';
import { DescriptionVisibilityControl, DescriptionMode } from '../config/DescriptionVisibilityControl';

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
                    className="flex items-center gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/25"
                  >
                    <TriangleAlert className="mr-2 h-4 w-4 flex-shrink-0 text-destructive" />
                    <span className="flex-grow text-destructive text-xs font-semibold truncate">Contenu corrompu: "{item.title}"</span>
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
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-card border border-border cursor-grab active:cursor-grabbing hover:bg-secondary/30 hover:border-input transition-all duration-150 select-none shadow-sm"
                >
                  {/* Left drag handle and title */}
                  <div className="flex items-center min-w-0 flex-1 gap-2.5">
                    <div className="hidden sm:flex items-center text-muted-foreground/60 cursor-grab px-1 py-1 hover:text-muted-foreground">
                      <GripVertical className="h-3 w-3" />
                    </div>
                    <div className="p-2 bg-secondary/50 border border-border/50 rounded-lg flex-shrink-0 flex items-center justify-center w-8 h-8">
                      <config.icon className={`${config.color} h-4 w-4`} />
                    </div>
                    <span className="flex-grow text-foreground text-xs font-semibold truncate pr-1">
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
                      className="h-8 w-8 p-0 flex items-center justify-center rounded-lg border border-border/50 bg-card hover:bg-secondary/50 disabled:opacity-30 disabled:hover:bg-card"
                      title="Monter"
                    >
                      <ArrowUp className="h-3 w-3 text-muted-foreground" />
                    </Button>

                    {/* Down button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={index === localLessons.length - 1}
                      onClick={() => moveDown(index)}
                      className="h-8 w-8 p-0 flex items-center justify-center rounded-lg border border-border/50 bg-card hover:bg-secondary/50 disabled:opacity-30 disabled:hover:bg-card"
                      title="Descendre"
                    >
                      <ArrowDown className="h-3 w-3 text-muted-foreground" />
                    </Button>

                    <div className="h-4 w-[1px] bg-muted mx-0.5"></div>

                    {/* Delete button */}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(index)}
                      className="h-8 w-8 p-0 flex items-center justify-center rounded-lg shadow-sm hover:brightness-105"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center text-muted-foreground/60 font-medium italic py-12 bg-secondary/50 border border-dashed border-border rounded-xl">
            <FolderOpen className="mx-auto mb-2 h-5 w-5 text-muted-foreground/40" />
            Aucun contenu principal à organiser.
          </div>
        )}
      </div>
    </Modal>
  );
};
