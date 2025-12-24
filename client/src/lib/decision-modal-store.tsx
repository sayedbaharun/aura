import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DecisionModalContextType {
  isOpen: boolean;
  openDecisionModal: (prefill?: DecisionPrefill) => void;
  closeDecisionModal: () => void;
  prefill: DecisionPrefill | null;
}

export interface DecisionPrefill {
  context?: string;
  decision?: string;
  reasoning?: string;
  source?: 'evening' | 'weekly' | 'capture' | 'ai_chat' | 'manual';
  tags?: string[];
}

const DecisionModalContext = createContext<DecisionModalContextType | undefined>(undefined);

export function DecisionModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prefill, setPrefill] = useState<DecisionPrefill | null>(null);

  const openDecisionModal = (prefillData?: DecisionPrefill) => {
    setPrefill(prefillData || null);
    setIsOpen(true);
  };

  const closeDecisionModal = () => {
    setIsOpen(false);
    setPrefill(null);
  };

  return (
    <DecisionModalContext.Provider value={{ isOpen, openDecisionModal, closeDecisionModal, prefill }}>
      {children}
    </DecisionModalContext.Provider>
  );
}

export function useDecisionModal() {
  const context = useContext(DecisionModalContext);
  if (context === undefined) {
    throw new Error('useDecisionModal must be used within a DecisionModalProvider');
  }
  return context;
}
