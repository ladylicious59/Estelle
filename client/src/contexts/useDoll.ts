import { useContext } from 'react';
import { DollContext, type DollContextType } from './DollContext';

export const useDoll = (): DollContextType => {
  const context = useContext(DollContext);
  if (context === undefined) {
    throw new Error('useDoll must be used within a DollProvider');
  }
  return context;
};
