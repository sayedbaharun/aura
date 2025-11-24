import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TaskDetailModalContextType {
  isOpen: boolean;
  taskId: string | null;
  mode: 'view' | 'edit';
  openTaskDetail: (taskId: string, mode?: 'view' | 'edit') => void;
  closeTaskDetail: () => void;
  setMode: (mode: 'view' | 'edit') => void;
}

const TaskDetailModalContext = createContext<TaskDetailModalContextType | undefined>(undefined);

export function TaskDetailModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  const openTaskDetail = (id: string, initialMode: 'view' | 'edit' = 'view') => {
    setTaskId(id);
    setMode(initialMode);
    setIsOpen(true);
  };

  const closeTaskDetail = () => {
    setIsOpen(false);
    setTaskId(null);
    setMode('view');
  };

  return (
    <TaskDetailModalContext.Provider
      value={{ isOpen, taskId, mode, openTaskDetail, closeTaskDetail, setMode }}
    >
      {children}
    </TaskDetailModalContext.Provider>
  );
}

export function useTaskDetailModal() {
  const context = useContext(TaskDetailModalContext);
  if (context === undefined) {
    throw new Error('useTaskDetailModal must be used within a TaskDetailModalProvider');
  }
  return context;
}
