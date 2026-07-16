import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { TriangleAlert, FileUp } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface ImportPlatformModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (fileContent: string) => void;
}

export const ImportPlatformModal: React.FC<ImportPlatformModalProps> = ({ isOpen, onClose, onImport }) => {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFileContent(null);
    setFileName('');
    setIsConfirmed(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [isOpen]);

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
            Importer et remplacer
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
            className="inline-flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-input bg-white px-4 py-4 text-muted-foreground transition-colors hover:border-destructive/60 hover:bg-destructive/5 hover:text-destructive"
          >
            <FileUp className="mx-auto mb-2 h-6 w-6" />
            <span className="font-semibold text-sm">
              {fileName || "Cliquer pour choisir un fichier de sauvegarde globale"}
            </span>
            <span className="text-xs text-muted-foreground/60 mt-1">Fichier .json uniquement</span>
          </label>
          <input ref={fileInputRef} type="file" id="platform-json-file-input" accept=".json" onChange={handleFileChange} className="sr-only" />
        </div>

        {fileContent && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <label className="flex items-center justify-center gap-3 cursor-pointer text-foreground">
              <Checkbox
                checked={isConfirmed}
                onCheckedChange={(checked) => setIsConfirmed(checked === true)}
                className="border-destructive/40 data-[state=checked]:bg-destructive data-[state=checked]:text-destructive-foreground data-[state=checked]:border-destructive"
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
