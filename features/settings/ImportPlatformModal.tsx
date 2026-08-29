import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { TriangleAlert, FileUp } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useLocale } from '@/i18n/LocaleProvider';

interface ImportPlatformModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (fileContent: string) => void;
}

export const ImportPlatformModal: React.FC<ImportPlatformModalProps> = ({ isOpen, onClose, onImport }) => {
  const { t } = useLocale();
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
      title={
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive shadow-xs">
            <TriangleAlert className="h-5 w-5 stroke-[2.2]" />
          </span>
          <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            {t('settings.importModal.title')}
          </span>
        </div>
      }
      description={t('settings.importModal.description')}
      maxWidth="xl"
      className="sm:max-w-2xl sm:rounded-2xl"
      headerClassName="px-5 pt-5 pb-3.5 sm:px-7 sm:pt-6 sm:pb-4 border-b border-border/50 bg-card/60"
      bodyClassName="px-5 py-4 sm:px-7 sm:py-5"
      footerClassName="px-5 py-3.5 sm:px-7 sm:py-4 border-t border-border/50 bg-card/60"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button type="button" onClick={onClose} variant="secondary" className="rounded-xl h-10 px-4 text-xs font-semibold sm:text-sm">
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            variant="destructive"
            disabled={!fileContent || !isConfirmed}
            className="rounded-xl font-bold px-5 h-10 text-xs sm:text-sm shadow-sm"
          >
            {t('settings.importModal.importAction')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-4 bg-destructive/[0.08] dark:bg-destructive/15 text-destructive rounded-2xl border border-destructive/30 shadow-xs">
          <div className="flex gap-3">
            <TriangleAlert className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
            <div>
              <p className="font-bold text-xs sm:text-sm">{t('settings.importModal.irreversibleTitle')}</p>
              <p className="text-xs mt-1 leading-relaxed text-destructive/90">
                {t('settings.importModal.warningBeforeAll')}
                <strong className="underline decoration-destructive font-extrabold mx-1">{t('settings.importModal.all')}</strong>
                {t('settings.importModal.warningAfterAll')}
              </p>
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor="platform-json-file-input"
            className="inline-flex min-h-28 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/80 bg-muted/30 px-5 py-5 text-center text-muted-foreground transition-all hover:border-destructive/60 hover:bg-destructive/5 hover:text-destructive"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border/80 shadow-2xs mb-2 text-destructive">
              <FileUp className="h-5 w-5" />
            </div>
            <span className="font-bold text-xs sm:text-sm text-foreground">
              {fileName || t('settings.importModal.chooseFile')}
            </span>
            <span className="text-[11px] text-muted-foreground font-medium mt-1">{t('settings.importModal.jsonOnly')}</span>
          </label>
          <input ref={fileInputRef} type="file" id="platform-json-file-input" accept=".json" onChange={handleFileChange} className="sr-only" />
        </div>

        {fileContent && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
            <label className="flex items-center justify-center gap-3 cursor-pointer text-foreground">
              <Checkbox
                checked={isConfirmed}
                onCheckedChange={(checked) => setIsConfirmed(checked === true)}
                className="border-destructive/40 data-[state=checked]:bg-destructive data-[state=checked]:text-destructive-foreground data-[state=checked]:border-destructive"
              />
              <span className="text-xs sm:text-sm font-bold text-destructive select-none">
                {t('settings.importModal.confirm')}
              </span>
            </label>
          </div>
        )}
      </div>
    </Modal>
  );
};
