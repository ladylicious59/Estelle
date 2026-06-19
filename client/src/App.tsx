import Sidebar from './components/Sidebar';
import DollVisualization from './components/DollVisualization';
import ChatWindow from './components/ChatWindow';
import { useDoll } from './contexts/DollContext';

function App() {
  const { isListening, isSpeaking, emotion } = useDoll();

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col lg:flex-row">
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <DollVisualization isListening={isListening} isSpeaking={isSpeaking} emotion={emotion} />
        </div>
        
        <div className="w-full lg:w-96 shrink-0 h-1/2 lg:h-full">
          <ChatWindow />
        </div>
      </main>
    </div>
  )
}

export default App
