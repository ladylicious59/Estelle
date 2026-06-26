import React from 'react';
import { Sparkles, Video, Mic, User } from 'lucide-react';

const CreateVideo = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Video</h1>
        <p className="text-slate-400">Follow the steps below to generate your AI avatar video.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {[
          { icon: <Sparkles className="text-indigo-500" />, step: 1, label: "Script" },
          { icon: <User className="text-slate-500" />, step: 2, label: "Avatar" },
          { icon: <Mic className="text-slate-500" />, step: 3, label: "Voice" },
        ].map((s) => (
          <div key={s.step} className={`p-4 rounded-xl border flex items-center gap-4 ${s.step === 1 ? 'bg-indigo-600/10 border-indigo-500/50' : 'bg-slate-900 border-slate-800 opacity-50'}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.step === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
              {s.icon}
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Step {s.step}</p>
              <p className="font-bold">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
        <label className="block text-sm font-medium text-slate-400 mb-4">What should your avatar say?</label>
        <textarea 
          className="w-full h-48 bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
          placeholder="Enter your script here... (e.g., Hi there! Welcome to our new product launch event. We're so excited to show you what we've been working on.)"
        ></textarea>
        
        <div className="mt-8 flex justify-between items-center">
          <p className="text-sm text-slate-500">0 / 500 characters</p>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2">
            Continue to Avatar
            <Video size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateVideo;
