import { Mic } from 'lucide-react';
import { useDoll } from '../contexts/DollContext';

export type Emotion = 'neutral' | 'happy' | 'sad' | 'thinking' | 'surprised' | 'laughing';

interface Props {
  isListening: boolean;
  isSpeaking: boolean;
  emotion?: Emotion;
}

const emotionEmojis: Record<Emotion, string> = {
  neutral: '🤖',
  happy: '😊',
  sad: '😢',
  thinking: '🤔',
  surprised: '😲',
  laughing: '😆'
};

export default function DollVisualization({ isListening, isSpeaking, emotion = 'neutral' }: Props) {
  const { setListening } = useDoll();

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gray-800/50 backdrop-blur-md rounded-3xl shadow-2xl border border-gray-700/50 w-full max-w-md mx-auto">
      <div className={`relative w-56 h-56 rounded-full border-4 flex items-center justify-center transition-all duration-700 ${
        isListening ? 'border-purple-500 scale-110 shadow-[0_0_30px_rgba(168,85,247,0.6)]' : 
        isSpeaking ? 'border-blue-500 scale-105 shadow-[0_0_30px_rgba(59,130,246,0.6)]' : 
        'border-gray-600 shadow-inner'
      }`}>
        {/* Glow effect */}
        <div className={`absolute inset-0 rounded-full blur-2xl opacity-20 transition-colors duration-700 ${
          isListening ? 'bg-purple-500' : isSpeaking ? 'bg-blue-500' : 'bg-transparent'
        }`} />

        {/* Doll Avatar */}
        <div className={`text-8xl transition-all duration-500 transform ${
          isSpeaking ? 'animate-bounce' : ''
        }`}>
          {emotionEmojis[emotion]}
        </div>
        
        {/* Animation rings */}
        {isListening && (
          <>
            <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-[ping_1.5s_linear_infinite]" />
            <div className="absolute inset-0 rounded-full border-2 border-purple-500/20 animate-[ping_2s_linear_infinite]" />
          </>
        )}

        {isSpeaking && (
          <div className="absolute -bottom-2 flex gap-1">
            <div className="w-1.5 h-6 bg-blue-500 rounded-full animate-[bounce_1s_infinite_0ms]" />
            <div className="w-1.5 h-10 bg-blue-500 rounded-full animate-[bounce_1s_infinite_200ms]" />
            <div className="w-1.5 h-6 bg-blue-500 rounded-full animate-[bounce_1s_infinite_400ms]" />
          </div>
        )}
      </div>
      
      <div className="mt-10 flex flex-col items-center gap-3">
        <h2 className="text-2xl font-bold text-white tracking-tight">Echo</h2>
        <div className="flex items-center gap-2 bg-gray-900/50 px-4 py-1.5 rounded-full border border-gray-700">
          <span className={`w-2.5 h-2.5 rounded-full ${
            isListening ? 'bg-purple-500 animate-pulse' : 
            isSpeaking ? 'bg-blue-500 animate-pulse' : 
            'bg-gray-500'
          }`} />
          <span className="text-gray-300 text-sm font-medium uppercase tracking-wider">
            {isListening ? 'Listening' : isSpeaking ? 'Speaking' : 'Idle'}
          </span>
        </div>
      </div>

      <button 
        onClick={() => setListening(!isListening)}
        className={`mt-10 p-5 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 active:scale-95 ${
          isListening ? 'bg-red-500 hover:bg-red-600 ring-4 ring-red-500/20' : 'bg-purple-600 hover:bg-purple-700 ring-4 ring-purple-600/20'
        }`}
      >
        <Mic size={28} className="text-white" />
      </button>
    </div>
  );
}
