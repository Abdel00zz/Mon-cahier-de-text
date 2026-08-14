import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { Textarea } from '../../components/ui/textarea';
import type { ClassInfo } from '../../types';
import { prepareImportedLessons } from '../../utils/importPipeline';
import { FileInput, FileUp } from '../../components/ui/icons';
import {
    fetchClassLessons,
    importClassLessons,
    type ClassLessonsImportResult,
} from '../api';

const MAX_IMPORT_BYTES = 850_000;
const encoder = new TextEncoder();

type ImportMode = 'replace' | 'append';
type PreparedImport = ReturnType<typeof prepareImportedLessons>;

interface ClassJsonImportModalProps {
    isOpen: boolean;
    phone: string;
    classInfo: ClassInfo | null;
    onClose: () => void;
    onImported: (result: ClassLessonsImportResult) => void;
}

const formatBytes = (bytes: number): string => `${Math.ceil(bytes / 1_000)} Ko`;

export const ClassJsonImportModal: React.FC<ClassJsonImportModalProps> = ({
    isOpen,
    phone,
    classInfo,
    onClose,
    onImported,
}) => {
    const [jsonText, setJsonText] = useState('');
    const [fileName, setFileName] = useState('');
    const [mode, setMode] = useState<ImportMode>('replace');
    const [preview, setPreview] = useState<PreparedImport | null>(null);
    const [expectedUpdatedAt, setExpectedUpdatedAt] = useState<string | null>(null);
    const [currentTopLevel, setCurrentTopLevel] = useState(0);
    const [isLoadingVersion, setIsLoadingVersion] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const fileRequestRef = useRef(0);

    useEffect(() => {
        if (!isOpen || !classInfo) return;
        let cancelled = false;
        fileRequestRef.current += 1;
        setJsonText('');
        setFileName('');
        setMode('replace');
        setPreview(null);
        setExpectedUpdatedAt(null);
        setCurrentTopLevel(0);
        setMessage(null);
        setIsImporting(false);
        setIsLoadingVersion(true);

        void fetchClassLessons(phone, classInfo.id)
            .then(blob => {
                if (cancelled) return;
                setExpectedUpdatedAt(blob.updatedAt ?? null);
                setCurrentTopLevel(Array.isArray(blob.lessonsData) ? blob.lessonsData.length : 0);
            })
            .catch(error => {
                if (!cancelled) {
                    setMessage(error instanceof Error ? error.message : 'Impossible de vérifier le cahier actuel.');
                }
            })
            .finally(() => {
                if (!cancelled) setIsLoadingVersion(false);
            });

        return () => { cancelled = true; };
    }, [isOpen, phone, classInfo]);

    const resetPreview = (text: string, name = '') => {
        setJsonText(text);
        setFileName(name);
        setPreview(null);
        setMessage(null);
    };

    const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > MAX_IMPORT_BYTES) {
            resetPreview('', file.name);
            setMessage(`Fichier trop volumineux (${formatBytes(file.size)}). Limite : ${formatBytes(MAX_IMPORT_BYTES)}.`);
            return;
        }
        const requestId = ++fileRequestRef.current;
        const reader = new FileReader();
        reader.onload = () => {
            if (requestId !== fileRequestRef.current) return;
            resetPreview(typeof reader.result === 'string' ? reader.result : '', file.name);
        };
        reader.onerror = () => {
            if (requestId === fileRequestRef.current) setMessage('Lecture du fichier impossible.');
        };
        reader.readAsText(file);
    };

    const analyze = () => {
        setMessage(null);
        try {
            const sourceBytes = encoder.encode(jsonText).byteLength;
            if (sourceBytes === 0) throw new Error('Collez un JSON ou choisissez un fichier.');
            if (sourceBytes > MAX_IMPORT_BYTES) {
                throw new Error(`JSON trop volumineux (${formatBytes(sourceBytes)}). Limite : ${formatBytes(MAX_IMPORT_BYTES)}.`);
            }
            const prepared = prepareImportedLessons(JSON.parse(jsonText));
            if (prepared.lessonsData.length === 0) {
                throw new Error('Aucun bloc de cours exploitable dans ce JSON.');
            }
            const canonicalBytes = encoder.encode(JSON.stringify({
                lessonsData: prepared.lessonsData,
                contentDirection: prepared.direction.direction,
            })).byteLength;
            if (canonicalBytes > MAX_IMPORT_BYTES) {
                throw new Error(`Contenu normalisé trop volumineux (${formatBytes(canonicalBytes)}).`);
            }
            setPreview(prepared);
        } catch (error) {
            setPreview(null);
            setMessage(error instanceof Error ? error.message : 'JSON invalide.');
        }
    };

    const confirmImport = async () => {
        if (!classInfo || !preview || isImporting || isLoadingVersion) return;
        setIsImporting(true);
        setMessage(null);
        try {
            const result = await importClassLessons(
                phone,
                classInfo.id,
                {
                    lessonsData: preview.lessonsData,
                    contentDirection: preview.direction.direction,
                },
                mode,
                expectedUpdatedAt,
            );
            onImported(result);
            onClose();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Import impossible.');
        } finally {
            setIsImporting(false);
        }
    };

    const safeClose = () => {
        if (!isImporting) onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={safeClose}
            blockDismiss={isImporting}
            maxWidth="3xl"
            className="sm:max-w-3xl sm:rounded-[32px]"
            headerClassName="px-5 pt-5 pb-3.5 sm:px-7 sm:pt-6 sm:pb-4 border-b border-border/50 bg-card/60"
            bodyClassName="px-5 py-5 sm:px-7 sm:py-6"
            footerClassName="px-5 py-3.5 sm:px-7 sm:py-4 border-t border-border/50 bg-card/60"
            title={
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
                        <FileInput className="h-5 w-5 stroke-[2.2]" />
                    </span>
                    <span className="text-base sm:text-lg font-bold text-foreground">
                        Importer un cahier JSON
                    </span>
                </div>
            }
            description="La destination est verrouillée sur la classe choisie ; l’identifiant éventuellement présent dans le fichier est ignoré."
            footer={(
                <div className="flex w-full items-center justify-end gap-2.5">
                    <Button type="button" variant="secondary" onClick={safeClose} disabled={isImporting} className="rounded-xl h-10 px-4 text-xs font-semibold sm:text-sm">
                        Annuler
                    </Button>
                    {preview ? (
                        <Button
                            type="button"
                            onClick={() => void confirmImport()}
                            disabled={isImporting || isLoadingVersion}
                            aria-busy={isImporting}
                            className="rounded-xl h-10 px-5 text-xs font-bold sm:text-sm shadow-sm"
                        >
                            {isImporting ? 'Import en cours…' : `Importer dans ${classInfo?.name ?? 'la classe'}`}
                        </Button>
                    ) : (
                        <Button type="button" onClick={analyze} disabled={!jsonText || isLoadingVersion} className="rounded-xl h-10 px-5 text-xs font-bold sm:text-sm shadow-sm">
                            Vérifier le JSON
                        </Button>
                    )}
                </div>
            )}
        >
            <div className="space-y-5">
                <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-4 sm:p-5 shadow-xs">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Classe de destination</p>
                    <p className="mt-1 text-base sm:text-lg font-bold text-foreground">{classInfo?.name}</p>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                        {classInfo?.subject} · {isLoadingVersion ? 'vérification du cahier…' : `${currentTopLevel} bloc(s) actuellement`}
                    </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2" aria-label="Mode d’import">
                    {([
                        ['replace', 'Remplacer le cahier', 'Le contenu actuel est remplacé après confirmation.'],
                        ['append', 'Ajouter à la suite', 'Les nouveaux blocs sont ajoutés après le contenu actuel.'],
                    ] as const).map(([value, label, hint]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setMode(value)}
                            aria-pressed={mode === value}
                            className={`min-h-16 rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                                mode === value
                                    ? 'border-primary/50 bg-primary/10 text-foreground ring-2 ring-primary/20 shadow-xs'
                                    : 'border-border/80 bg-card text-muted-foreground hover:bg-muted/40'
                            }`}
                        >
                            <span className="block text-xs sm:text-sm font-bold text-foreground">{label}</span>
                            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{hint}</span>
                        </button>
                    ))}
                </div>

                {mode === 'replace' && (
                    <p className="rounded-2xl border border-warning/30 bg-warning/10 p-3.5 text-xs font-semibold text-warning leading-relaxed">
                        Le remplacement est destructif. Une vérification du contenu et de la version cloud est faite avant l’écriture.
                    </p>
                )}

                <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="block text-xs sm:text-sm font-bold text-foreground" htmlFor="admin-class-json">
                            Coller le JSON
                        </label>
                        <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-muted/30 px-3.5 text-xs font-bold text-foreground hover:bg-muted transition-colors">
                            <FileUp className="h-4 w-4 text-muted-foreground" />
                            {fileName || 'Choisir un fichier .json'}
                            <input type="file" accept=".json,application/json" onChange={handleFile} className="sr-only" />
                        </label>
                    </div>
                    <Textarea
                        id="admin-class-json"
                        value={jsonText}
                        onChange={event => {
                            fileRequestRef.current += 1;
                            resetPreview(event.target.value);
                        }}
                        rows={8}
                        spellCheck={false}
                        placeholder={'{\n  "lessonsData": [\n    { "type": "chapter", "title": "Chapitre 1", "sections": [] }\n  ]\n}'}
                        className="min-h-48 resize-y font-mono text-xs leading-relaxed rounded-2xl border-border/80 bg-muted/20 focus-visible:bg-card"
                    />
                    <p className="text-[11px] text-muted-foreground font-medium">Taille maximale : {formatBytes(MAX_IMPORT_BYTES)} en UTF-8.</p>
                </div>

                {message && (
                    <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs font-semibold text-destructive">
                        {message}
                    </div>
                )}

                {preview && (
                    <div role="status" aria-live="polite" className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-700 dark:text-emerald-300">
                        <p className="text-xs sm:text-sm font-bold">JSON valide — prêt à importer</p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold">
                            <span>{preview.report.topLevelCount} bloc(s)</span>
                            <span>{preview.report.itemCount} élément(s)</span>
                            <span>{preview.report.normalizedDates} date(s) normalisée(s)</span>
                            <span>Direction {preview.direction.direction.toUpperCase()}</span>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

