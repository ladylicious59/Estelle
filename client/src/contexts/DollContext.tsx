import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Emotion } from '../components/DollVisualization';

interface DollState {
  isListening: boolean;
  isSpeaking: boolean;
  emotion: Emotion;
}

interface DollContextType extends DollState {
  setListening: (val: boolean) => void;
  setSpeaking: (val: boolean) => void;
  setEmotion: (val: Emotion) => void;
  updateState: (newState: Partial<DollState>) => void;
}

const DollContext = createContext<DollContextType | undefined>(undefined);

export const DollProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<DollState>({
    isListening: false,
    isSpeaking: false,
    emotion: 'neutral',
  });

  const setListening = (isListening: boolean) => setState(prev => ({ ...prev, isListening }));
  const setSpeaking = (isSpeaking: boolean) => setState(prev => ({ ...prev, isSpeaking }));
  const setEmotion = (emotion: Emotion) => setState(prev => ({ ...prev, emotion }));
  
  const updateState = (newState: Partial<DollState>) => {
    setState(prev => ({ ...prev, ...newState }));
  };

  // Prepare for real-time updates
  useEffect(() => {
    // Example: This is where we would connect to a WebSocket
    // const socket = new WebSocket('ws://localhost:8000/ws/doll');
    // socket.onmessage = (event) => {
    //   const data = JSON.parse(event.data);
    //   updateState(data);
    // };
    // return () => socket.close();
    
    console.log('DollProvider initialized. Ready for real-time updates.');
  }, []);

  return (
    <DollContext.Provider value={{ ...state, setListening, setSpeaking, setEmotion, updateState }}>
      {children}
    </DollContext.Provider>
  );
};

export const useDoll = () => {
  const context = useContext(DollContext);
  if (context === undefined) {
    throw new Error('useDoll must be used within a DollProvider');
  }
  return context;
};
