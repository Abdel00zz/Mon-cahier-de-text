import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { TriangleAlert, FileUp } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useLocale } from '@/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

interface ImportPlatformModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (fileContent: string) => void;
}

export const ImportPlatformModal: React.FC<ImportPlatformModalProps> = ({ isOpen, onClose, onImport }) => {
  const { isRtl, t } = useLocale();
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
      title={t('settings.importModal.title')}
      description={t('settings.importModal.description')}
      maxWidth="xl"
      footer={
        <>
          <Button type="button" onClick={onClose} variant="secondary">
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            variant="destructive"
            disabled={!fileContent || !isConfirmed}
          >
            {t('settings.importModal.importAction')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className={cn('p-4 bg-destructive/10 text-destructive rounded-md', isRtl ? 'border-r-4' : 'border-l-4', 'border-destructive')}>
          <div className="flex">
            <div className="py-1">
              <TriangleAlert className={cn('h-5 w-5 shrink-0 text-destructive', isRtl ? 'ml-3' : 'mr-3')} />
            </div>
            <div>
              <p className="font-bold text-sm">{t('settings.importModal.irreversibleTitle')}</p>
              <p className="text-xs mt-1 leading-relaxed text-destructive">
                {t('settings.importModal.warningBeforeAll')}
                <strong>{t('settings.importModal.all')}</strong>
                {t('settings.importModal.warningAfterAll')}
              </p>
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor="platform-json-file-input"
            className="inline-flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-input bg-card px-4 py-4 text-muted-foreground transition-colors hover:border-destructive/60 hover:bg-destructive/5 hover:text-destructive"
          >
            <FileUp className="mx-auto mb-2 h-6 w-6" />
            <span className="font-semibold text-sm">
              {fileName || t('settings.importModal.chooseFile')}
            </span>
            <span className="text-xs text-muted-foreground/60 mt-1">{t('settings.importModal.jsonOnly')}</span>
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
                {t('settings.importModal.confirm')}
              </span>
            </label>
          </div>
        )}
      </div>
    </Modal>
  );
};
