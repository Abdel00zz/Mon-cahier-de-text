import React, { useState } from 'react';
import { Dialog } from '../ui/dialog';
import { FileUp } from '../ui/icons';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any, mode: 'replace' | 'append') => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [jsonText, setJsonText] = useState('');
  const [fileName, setFileName] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setJsonText(e.target?.result as string);
      };
      reader.readAsText(file);
      setFileName(file.name);
    }
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonText);
      onImport(parsed, importMode);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Format JSON invalide.";
        alert(`Erreur d'importation: ${message}`);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Importer des cours ou une classe"
      description="Sélectionnez un fichier JSON ou collez son contenu ci-dessous"
      maxWidth="xl"
      footer={
        <>
          <Button type="button" onClick={onClose} variant="secondary">
            Annuler
          </Button>
          <Button type="button" onClick={handleImport} variant="primary" disabled={!jsonText}>
            Importer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="json-file-input"
            className="w-full inline-flex flex-col items-center justify-center px-4 py-6 bg-slate-50 text-slate-600 rounded-xl border-2 border-dashed border-slate-300 hover:border-primary hover:bg-primary/5 hover:text-primary cursor-pointer transition-colors"
          >
            <FileUp className="mx-auto mb-2 h-6 w-6" />
            <span className="font-semibold text-sm">
              {fileName || "Cliquer pour choisir un fichier de sauvegarde (.json)"}
            </span>
            <span className="text-xs text-slate-400 mt-1">...ou collez le texte brut ci-dessous</span>
          </label>
          <input type="file" id="json-file-input" accept=".json" onChange={handleFileChange} className="sr-only" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contenu brut du JSON</label>
          <Textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder="Collez le contenu JSON ici..."
            className="h-36 resize-y"
          />
        </div>

        <div className="p-3 bg-slate-100 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 border border-border">
          <span className="font-medium text-slate-700 text-sm">Mode d'importation :</span>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-800">
              <input
                type="radio"
                name="importMode"
                value="replace"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
                className="form-radio h-4 w-4 text-primary focus:ring-primary border-slate-300"
              />
              <span>Remplacer tout</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-800">
              <input
                type="radio"
                name="importMode"
                value="append"
                checked={importMode === 'append'}
                onChange={() => setImportMode('append')}
                className="form-radio h-4 w-4 text-primary focus:ring-primary border-slate-300"
              />
              <span>Ajouter à la suite</span>
            </label>
          </div>
        </div>
      </div>
    </Dialog>
  );
};