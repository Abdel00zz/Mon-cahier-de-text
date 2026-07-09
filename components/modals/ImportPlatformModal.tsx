import React, { useState } from 'react';
import { Modal } from '../ui/modal';
import { TriangleAlert, FileUp } from '../ui/icons';
import { Button } from '../ui/button';

interface ImportPlatformModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (fileContent: string) => void;
}

export const ImportPlatformModal: React.FC<ImportPlatformModalProps> = ({ isOpen, onClose, onImport }) => {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileContent(e.target?.result as string);
      };
      reader.readAsText(file);
      setFileName(file.name);
    }
  };

  const handleImport = () => {
    if (fileContent) {
      onImport(fileContent);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Importer une sauvegarde complète"
      description="Remplacement global des données de l'application"
      maxWidth="xl"
      footer={
        <>
          <Button type="button" onClick={onClose} variant="secondary">
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            variant="destructive"
            disabled={!fileContent || !isConfirmed}
          >
            <TriangleAlert className="mr-2 h-3.5 w-3.5" /> Importer et remplacer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="p-4 bg-destructive/10 border-l-4 border-destructive text-destructive rounded-md">
          <div className="flex">
            <div className="py-1">
              <TriangleAlert className="mr-3 h-5 w-5 shrink-0 text-destructive" />
            </div>
            <div>
              <p className="font-bold text-sm">Attention : Action irréversible</p>
              <p className="text-xs mt-1 leading-relaxed text-destructive">
                L'importation d'une sauvegarde globale remplacera{' '}
                <strong className="uppercase">toutes</strong> vos données actuelles (classes, cours, configuration).
                Cette action écrasera la base de données locale actuelle.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor="platform-json-file-input"
            className="w-full inline-flex flex-col items-center justify-center px-4 py-6 bg-secondary/50 text-muted-foreground rounded-xl border-2 border-dashed border-input hover:border-destructive hover:bg-destructive/5 hover:text-destructive cursor-pointer transition-colors"
          >
            <FileUp className="mx-auto mb-2 h-6 w-6" />
            <span className="font-semibold text-sm">
              {fileName || "Cliquer pour choisir un fichier de sauvegarde globale"}
            </span>
            <span className="text-xs text-muted-foreground/60 mt-1">Fichier .json uniquement</span>
          </label>
          <input type="file" id="platform-json-file-input" accept=".json" onChange={handleFileChange} className="sr-only" />
        </div>

        {fileContent && (
          <div className="p-3.5 rounded-xl bg-destructive/5 border border-destructive/20">
            <label className="flex items-center gap-3 cursor-pointer text-foreground">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-destructive/40 text-destructive focus:ring-destructive focus:ring-offset-1"
              />
              <span className="text-xs font-semibold text-destructive select-none">
                Je comprends que l'importation écrasera définitivement toutes mes données actuelles.
              </span>
            </label>
          </div>
        )}
      </div>
    </Modal>
  );
};