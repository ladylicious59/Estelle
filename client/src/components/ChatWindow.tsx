import { useState } from 'react';
import { Send } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am Echo, your AI companion. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: 'user', content: input }]);
    setInput('');
    // Mock response
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm processing your request..." }]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl ${
              m.role === 'user' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-gray-800 text-gray-200 rounded-tl-none'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-4 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-gray-800 text-white p-3 rounded-xl border border-gray-700 focus:outline-none focus:border-purple-500"
          />
          <button 
            onClick={handleSend}
            className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-xl transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
