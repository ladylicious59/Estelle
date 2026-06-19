import { Settings, MessageSquare, History, Sparkles } from 'lucide-react';

export default function Sidebar() {
  return (
    <div className="w-64 bg-gray-900 text-white h-full flex flex-col p-4 border-r border-gray-800">
      <div className="flex items-center gap-2 mb-8 px-2">
        <Sparkles className="text-purple-400" />
        <h1 className="text-xl font-bold">EchoDoll</h1>
      </div>
      
      <nav className="flex-1 space-y-2">
        <button className="flex items-center gap-3 w-full p-3 rounded-lg bg-gray-800 text-purple-400">
          <MessageSquare size={20} />
          <span>Chat</span>
        </button>
        <button className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-gray-800 transition-colors">
          <History size={20} />
          <span>History</span>
        </button>
      </nav>

      <div className="mt-auto pt-4 border-t border-gray-800">
        <button className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-gray-800 transition-colors">
          <Settings size={20} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}
