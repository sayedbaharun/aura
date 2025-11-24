import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CaptureModalContextType {
  isOpen: boolean;
  openCaptureModal: () => void;
  closeCaptureModal: () => void;
}

const CaptureModalContext = createContext<CaptureModalContextType | undefined>(undefined);

export function CaptureModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openCaptureModal = () => setIsOpen(true);
  const closeCaptureModal = () => setIsOpen(false);

  return (
    <CaptureModalContext.Provider value={{ isOpen, openCaptureModal, closeCaptureModal }}>
      {children}
    </CaptureModalContext.Provider>
  );
}

export function useCaptureModal() {
  const context = useContext(CaptureModalContext);
  if (context === undefined) {
    throw new Error('useCaptureModal must be used within a CaptureModalProvider');
  }
  return context;
}
