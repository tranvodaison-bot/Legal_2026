import React from 'react';
import {
  SecureDocumentViewerModal,
  SecureDocumentViewerModalProps,
} from './SecureDocumentViewerModal';

export const SecurePdfViewerModal: React.FC<SecureDocumentViewerModalProps> = props => (
  <SecureDocumentViewerModal {...props} />
);

export default SecurePdfViewerModal;
