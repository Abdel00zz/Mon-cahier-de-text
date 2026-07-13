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
          <Button type="button" onClick={onClose} variant="secondary">Fermer</Button>
          {panel === 'export' ? (
            <Button type="button" onClick={onExport}>Exporter le cahier</Button>
          ) : (
            <Button type="button" onClick={handleImport} disabled={!jsonText}>Importer les données</Button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1" role="tablist" aria-label="Type de transfert">
          <button
            type="button"
            role="tab"
            aria-selected={panel === 'import'}
            onClick={() => setPanel('import')}
            className={`min-h-10 rounded-lg px-3 font-mono text-[10px] font-extrabold uppercase tracking-[0.04em] transition-colors ${panel === 'import' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Importer
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={panel === 'export'}
            onClick={() => setPanel('export')}
            className={`min-h-10 rounded-lg px-3 font-mono text-[10px] font-extrabold uppercase tracking-[0.04em] transition-colors ${panel === 'export' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Exporter
          </button>
        </div>

        {panel === 'export' ? (
          <section className="flex flex-col items-start gap-4 py-2 sm:flex-row sm:items-center">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileDown className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-foreground">Créer une sauvegarde de ce cahier</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Le fichier JSON contient l’identité de la classe et tout son contenu pédagogique. Conservez-le avant une modification importante ou un changement d’appareil.
              </p>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            {message && (
              <div className="rounded-xl border border-warning/25 bg-warning/10 px-3 py-2.5 text-xs leading-relaxed text-foreground" role="status">
                <p className="font-bold">Vérifiez le fichier</p>
                <p className="mt-0.5 text-muted-foreground">{message}</p>
              </div>
            )}

            <div>
              <label
                htmlFor="data-transfer-json-file"
                className="inline-flex min-h-28 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-input bg-secondary/45 px-4 py-5 text-center text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
              >
                <FileUp className="mb-2 h-5 w-5" aria-hidden />
                <span className="text-sm font-semibold">{fileName || 'Choisir une sauvegarde JSON'}</span>
                <span className="mt-1 text-xs text-muted-foreground/65">Fichier .json · 10 Mo maximum</span>
              </label>
              <input type="file" id="data-transfer-json-file" accept=".json,application/json" onChange={handleFileChange} className="sr-only" />
            </div>

            <details className="group rounded-xl bg-secondary/55 px-3 py-2.5">
              <summary className="cursor-pointer text-xs font-bold text-muted-foreground transition-colors hover:text-foreground">
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
                className="mt-3 h-32 resize-y bg-card font-mono text-xs"
              />
            </details>

            <div className="grid gap-2 sm:grid-cols-2" aria-label="Mode d'importation">
              <button
                type="button"
                onClick={() => setImportMode('replace')}
                aria-pressed={importMode === 'replace'}
                className={`min-h-16 rounded-xl px-3 py-2.5 text-left transition-colors ${importMode === 'replace' ? 'bg-primary/10 text-primary ring-1 ring-primary/25' : 'bg-secondary/55 text-muted-foreground hover:text-foreground'}`}
              >
                <span className="block text-sm font-extrabold">Remplacer le cahier</span>
                <span className="mt-0.5 block text-[11px] leading-snug">Le contenu actuel est remplacé. L’action reste annulable.</span>
              </button>
              <button
                type="button"
                onClick={() => setImportMode('append')}
                aria-pressed={importMode === 'append'}
                className={`min-h-16 rounded-xl px-3 py-2.5 text-left transition-colors ${importMode === 'append' ? 'bg-primary/10 text-primary ring-1 ring-primary/25' : 'bg-secondary/55 text-muted-foreground hover:text-foreground'}`}
              >
                <span className="block text-sm font-extrabold">Ajouter à la suite</span>
                <span className="mt-0.5 block text-[11px] leading-snug">Le contenu importé est ajouté après le cahier actuel.</span>
              </button>
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
};
