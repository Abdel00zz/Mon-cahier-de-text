import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { FileDown, FileUp } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface DataTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any, mode: 'replace' | 'append') => void;
  onExport: () => void;
}

type TransferPanel = 'import' | 'export';

export const DataTransferModal: React.FC<DataTransferModalProps> = ({ isOpen, onClose, onImport, onExport }) => {
  const [panel, setPanel] = useState<TransferPanel>('import');
  const [jsonText, setJsonText] = useState('');
  const [fileName, setFileName] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPanel('import');
    setJsonText('');
    setFileName('');
    setImportMode('replace');
    setMessage(null);
  }, [isOpen]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage(null);
    if (file.size > 10 * 1024 * 1024) {
      setMessage('Le fichier dépasse 10 Mo. Choisissez une sauvegarde JSON plus légère.');
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      setJsonText(typeof e.target?.result === 'string' ? e.target.result : '');
      setFileName(file.name);
    };
    reader.onerror = () => setMessage('Le fichier ne peut pas être lu sur cet appareil.');
    reader.readAsText(file);
  };

  const handleImport = () => {
    setMessage(null);
    try {
      const parsed = JSON.parse(jsonText);
      onImport(parsed, importMode);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Format JSON invalide.';
      setMessage(`Le fichier ne peut pas être importé : ${detail}`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Importer ou exporter"
      description="Un espace unique pour sauvegarder ce cahier ou restaurer des données"
      maxWidth="xl"
      footer={
        <>
          <Button type="button" onClick={onClose} variant="secondary" className="rounded-xl">Fermer</Button>
          {panel === 'export' ? (
            <Button type="button" onClick={onExport} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-5 shadow-sm">Exporter le cahier</Button>
          ) : (
            <Button type="button" onClick={handleImport} disabled={!jsonText} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-5 shadow-sm">Importer les données</Button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1" role="tablist" aria-label="Type de transfert">
          <button
            type="button"
            role="tab"
            aria-selected={panel === 'import'}
            onClick={() => setPanel('import')}
            className={`min-h-9 rounded-lg px-3 font-mono text-[10px] font-extrabold uppercase tracking-wide transition-all duration-150 ${panel === 'import' ? 'bg-white text-zinc-800 shadow-xs border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-800'}`}
          >
            Importer
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={panel === 'export'}
            onClick={() => setPanel('export')}
            className={`min-h-9 rounded-lg px-3 font-mono text-[10px] font-extrabold uppercase tracking-wide transition-all duration-150 ${panel === 'export' ? 'bg-white text-zinc-800 shadow-xs border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-800'}`}
          >
            Exporter
          </button>
        </div>

        {panel === 'export' ? (
          <section className="flex flex-col items-start gap-4 py-2 sm:flex-row sm:items-center">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 border border-zinc-200">
              <FileDown className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-zinc-800">Créer une sauvegarde de ce cahier</h3>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                Le fichier JSON contient l’identité de la classe et tout son contenu pédagogique. Conservez-le avant une modification importante ou un changement d’appareil.
              </p>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            {message && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-xs leading-relaxed text-amber-900" role="status">
                <p className="font-bold">Vérifiez le fichier</p>
                <p className="mt-0.5 text-amber-800/90">{message}</p>
              </div>
            )}

            <div>
              <label
                htmlFor="data-transfer-json-file"
                className="inline-flex min-h-28 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-5 text-center text-zinc-500 transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-800"
              >
                <FileUp className="mb-2 h-5 w-5 text-zinc-400" aria-hidden />
                <span className="text-xs font-bold text-zinc-700">{fileName || 'Choisir une sauvegarde JSON'}</span>
                <span className="mt-1 text-[10px] text-zinc-400 font-medium">Fichier .json · 10 Mo maximum</span>
              </label>
              <input type="file" id="data-transfer-json-file" accept=".json,application/json" onChange={handleFileChange} className="sr-only" />
            </div>

            <details className="group rounded-xl bg-zinc-50/65 border border-zinc-200/50 px-3 py-2.5">
              <summary className="cursor-pointer text-[11px] font-bold text-zinc-500 transition-colors hover:text-zinc-800">
                Coller directement le contenu JSON
              </summary>
              <Textarea
                value={jsonText}
                onChange={event => {
                  setJsonText(event.target.value);
                  setFileName('');
                  setMessage(null);
                }}
                placeholder="Collez le contenu JSON ici…"
                className="mt-3 h-32 resize-y bg-white border border-zinc-200 focus:ring-0 focus:border-zinc-300 font-mono text-xs"
              />
            </details>

            <div className="grid gap-2 sm:grid-cols-2" aria-label="Mode d'importation">
              <button
                type="button"
                onClick={() => setImportMode('replace')}
                aria-pressed={importMode === 'replace'}
                className={`min-h-16 rounded-xl px-3 py-2.5 text-left transition-all duration-150 ${importMode === 'replace' ? 'bg-zinc-100/60 text-zinc-800 border border-zinc-300 shadow-xs' : 'bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50/50'}`}
              >
                <span className="block text-xs font-bold">Remplacer le cahier</span>
                <span className="mt-0.5 block text-[10px] font-medium leading-normal text-zinc-500">Le contenu actuel est remplacé. L’action reste annulable.</span>
              </button>
              <button
                type="button"
                onClick={() => setImportMode('append')}
                aria-pressed={importMode === 'append'}
                className={`min-h-16 rounded-xl px-3 py-2.5 text-left transition-all duration-150 ${importMode === 'append' ? 'bg-zinc-100/60 text-zinc-800 border border-zinc-300 shadow-xs' : 'bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50/50'}`}
              >
                <span className="block text-xs font-bold">Ajouter à la suite</span>
                <span className="mt-0.5 block text-[10px] font-medium leading-normal text-zinc-500">Le contenu importé est ajouté après le cahier actuel.</span>
              </button>
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
};
