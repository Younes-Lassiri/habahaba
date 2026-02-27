import React, { createContext, useContext, useRef, useCallback } from 'react';

interface ScrollPositionContextType {
  saveScrollPosition: (key: string, y: number) => void;
  getScrollPosition: (key: string) => number;
  clearScrollPosition: (key: string) => void;
}

const ScrollPositionContext = createContext<ScrollPositionContextType>({
  saveScrollPosition: () => {},
  getScrollPosition: () => 0,
  clearScrollPosition: () => {},
});

export const ScrollPositionProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const scrollPositions = useRef<Record<string, number>>({});
  
  const saveScrollPosition = useCallback((key: string, y: number) => {
    scrollPositions.current[key] = y;
  }, []);

  const getScrollPosition = useCallback((key: string): number => {
    return scrollPositions.current[key] || 0;
  }, []);

  const clearScrollPosition = useCallback((key: string) => {
    delete scrollPositions.current[key];
  }, []);

  return (
    <ScrollPositionContext.Provider
      value={{
        saveScrollPosition,
        getScrollPosition,
        clearScrollPosition,
      }}
    >
      {children}
    </ScrollPositionContext.Provider>
  );
};

export const useScrollPosition = () => useContext(ScrollPositionContext);