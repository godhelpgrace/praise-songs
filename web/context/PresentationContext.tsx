'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type PresentationItem = {
  id: string;
  title: string;
  sheetUrl: string;
};

type PresentationContextType = {
  items: PresentationItem[];
  addItem: (item: PresentationItem) => void;
  removeItem: (id: string) => void;
  clearList: () => void;
  reorderList: (fromIndex: number, toIndex: number) => void;
  isInList: (id: string) => boolean;
};

const PresentationContext = createContext<PresentationContextType | undefined>(undefined);

export function PresentationProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<PresentationItem[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('presentationList');
    if (stored) {
      try {
        setItems(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse presentation list', e);
      }
    }
  }, []);

  // Save to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem('presentationList', JSON.stringify(items));
  }, [items]);

  const addItem = (item: PresentationItem) => {
    setItems(prev => {
      if (prev.find(i => i.id === item.id)) return prev;
      return [...prev, item];
    });
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const clearList = () => {
    setItems([]);
  };

  const reorderList = (fromIndex: number, toIndex: number) => {
    setItems(prev => {
      const newItems = [...prev];
      const [movedItem] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, movedItem);
      return newItems;
    });
  };

  const isInList = (id: string) => {
    return items.some(i => i.id === id);
  };

  return (
    <PresentationContext.Provider value={{ items, addItem, removeItem, clearList, reorderList, isInList }}>
      {children}
    </PresentationContext.Provider>
  );
}

export function usePresentation() {
  const context = useContext(PresentationContext);
  if (context === undefined) {
    throw new Error('usePresentation must be used within a PresentationProvider');
  }
  return context;
}
