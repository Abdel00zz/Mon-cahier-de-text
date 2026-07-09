import React, { useEffect } from 'react';
import { Modal } from '../ui/modal';
import { Smartphone } from '../ui/icons';
import { Button } from '../ui/button';

interface OrientationAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrientationAlertModal: React.FC<OrientationAlertModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => {
      if (window.innerWidth > window.innerHeight) {
        onClose();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mode paysage conseillé"
      maxWidth="sm"
      className="max-w-[320px] mx-auto sm:max-w-[320px]"
    >
      <div className="text-center space-y-3 py-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center text-warning mb-2">
          <Smartphone className="h-5 w-5 rotate-90" />
        </div>
        <p className="text-xs text-muted-foreground">
          Tournez votre téléphone à l'horizontale pour une meilleure lisibilité du cahier de textes.
        </p>
        <Button
          onClick={onClose}
          variant="default"
          className="w-full mt-4"
        >
          D'accord
        </Button>
      </div>
    </Modal>
  );
};
