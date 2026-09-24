import React from 'react';
import { ContentModal, type AddContentModalProps } from './ContentModal';

/** Point d'entrée conservé pour les appelants existants. */
export const AddContentModal: React.FC<AddContentModalProps> = props => <ContentModal {...props} />;
