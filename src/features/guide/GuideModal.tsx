import type { ReactNode } from 'react';
import type { GuideReference } from '@/constants/guide/model';
import { Modal } from '@/components/ui/modal';
import { useLocale } from '@/i18n/LocaleProvider';
import { GuideContent } from './GuideContent';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  mobileNavigation?: ReactNode;
  focusRequest?: GuideReference | null;
  initialReference?: GuideReference | null;
}
export function GuideModal({ isOpen, onClose, mobileNavigation, focusRequest, initialReference }: GuideModalProps) {
  const { locale } = useLocale();
  const isAr = locale === 'ar';
  return <Modal isOpen={isOpen} onClose={onClose} dir={isAr ? 'rtl' : 'ltr'}
    maxWidth="3xl" mobilePresentation="dialog"
    className="learning-guide-modal learning-guide"
    headerClassName="learning-guide-modal-header"
    bodyClassName="learning-guide-modal-body" bottomNavigation={mobileNavigation}
    title={<span className="guide-title">{isAr ? 'المساعدة' : 'Aide'}</span>}>
    {isOpen && <GuideContent reference={focusRequest ?? initialReference} />}
  </Modal>;
}
