import React, { useState, useEffect, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { SettingsModalProps, SettingsData, SettingsTabType } from './types';
import { ModalHeader } from './ModalHeader';
import { TabNavigation } from './TabNavigation';
import { ModalFooter } from './ModalFooter';
import { TimetableTab } from './tabs/TimetableTab';
import { ProfileTab } from './tabs/ProfileTab';
import { AppearanceTab } from './tabs/AppearanceTab';
import { NotificationsTab } from './tabs/NotificationsTab';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  initialTab = 'timetable',
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabType>(initialTab);
  const [draftData, setDraftData] = useState<SettingsData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, startTransition] = useTransition();

  // Synchronise avec les données initiales dès l'ouverture
  useEffect(() => {
    if (isOpen) {
      setDraftData(initialData);
      setActiveTab(initialTab);
    }
  }, [isOpen, initialData, initialTab]);

  // Verrouillage du scroll du corps (Body Scroll Lock)
  useEffect(() => {
    if (!isOpen) return;
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen]);

  // Écoute de la touche Échap (Escape Key Listener)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleTabChange = (tab: SettingsTabType) => {
    startTransition(() => {
      setActiveTab(tab);
    });
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      await onSave(draftData);
      onClose();
    } catch (err) {
      console.error('Erreur lors de la sauvegarde des paramètres :', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[120] flex flex-col justify-end sm:items-center sm:justify-center"
        >
          {/* Backdrop Scrim with Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 bg-espresso-900/40 dark:bg-black/60 backdrop-blur-[3px]"
          />

          {/* Modal Container (Bottom Sheet on Mobile, Centered Dialog on Desktop) */}
          <motion.div
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative z-10 flex flex-col w-full sm:max-w-xl max-h-[92dvh] sm:max-h-[85dvh] overflow-hidden rounded-t-[20px] sm:rounded-2xl border border-cream-300 dark:border-border/80 bg-cream-50 dark:bg-card text-espresso-900 dark:text-foreground shadow-2xl"
          >
            {/* Header */}
            <ModalHeader activeTab={activeTab} onClose={onClose} />

            {/* Tab Navigation */}
            <TabNavigation activeTab={activeTab} onSelectTab={handleTabChange} />

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3.5 sm:px-5 sm:py-4 [-webkit-overflow-scrolling:touch]">
              {activeTab === 'timetable' && (
                <TimetableTab />
              )}

              {activeTab === 'profile' && (
                <ProfileTab
                  profile={draftData.profile}
                  onChange={profile => setDraftData(prev => ({ ...prev, profile }))}
                />
              )}

              {activeTab === 'appearance' && (
                <AppearanceTab
                  appearance={draftData.appearance}
                  onChange={appearance => setDraftData(prev => ({ ...prev, appearance }))}
                />
              )}

              {activeTab === 'notifications' && (
                <NotificationsTab
                  notifications={draftData.notifications}
                  onChange={notifications => setDraftData(prev => ({ ...prev, notifications }))}
                />
              )}
            </div>

            {/* Footer */}
            <ModalFooter
              onSave={handleSave}
              onCancel={onClose}
              isSubmitting={isSubmitting}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
