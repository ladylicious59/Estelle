import { Mic } from 'lucide-react';

interface Props {
  isListening: boolean;
  isSpeaking: boolean;
}

export default function DollVisualization({ isListening, isSpeaking }: Props) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gray-800 rounded-2xl shadow-xl border border-gray-700">
      <div className={`relative w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${
        isListening ? 'border-purple-500 scale-105 shadow-[0_0_20px_rgba(168,85,247,0.5)]' : 
        isSpeaking ? 'border-blue-500 scale-105 shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 
        'border-gray-600'
      }`}>
        {/* Placeholder for Doll Avatar */}
        <div className="text-6xl">🤖</div>
        
        {/* Animation rings */}
        {(isListening || isSpeaking) && (
          <div className={`absolute inset-0 rounded-full animate-ping opacity-25 ${
            isListening ? 'bg-purple-500' : 'bg-blue-500'
          }`} />
        )}
      </div>
      
      <div className="mt-6 flex flex-col items-center gap-2">
        <h2 className="text-xl font-semibold text-white">Echo</h2>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${
            isListening ? 'bg-purple-500 animate-pulse' : 
            isSpeaking ? 'bg-blue-500 animate-pulse' : 
            'bg-gray-500'
          }`} />
          <span className="text-gray-400 text-sm">
            {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Idle'}
          </span>
        </div>
      </div>

      <button className={`mt-8 p-4 rounded-full transition-all ${
        isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-purple-600 hover:bg-purple-700'
      }`}>
        <Mic size={24} className="text-white" />
      </button>
    </div>
  );
}
