import React from 'react';
import { ContentModal, type EditContentModalProps } from './ContentModal';

export const EditContentModal: React.FC<EditContentModalProps> = props => <ContentModal {...props} mode="edit" />;
