import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import CreateVideo from './pages/CreateVideo';

// Simple placeholder components for other routes
const MyVideos = () => (
  <div>
    <h1 className="text-3xl font-bold mb-8">My Videos</h1>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="aspect-video bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-500">
        No videos yet. Create your first one!
      </div>
    </div>
  </div>
);

const Settings = () => (
  <div>
    <h1 className="text-3xl font-bold mb-8">Settings</h1>
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-2xl">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Email Address</label>
          <input type="text" readOnly value="alex@example.com" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-300" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Subscription Plan</label>
          <div className="flex items-center justify-between p-4 bg-indigo-600/10 border border-indigo-500/50 rounded-lg text-indigo-400">
            <span className="font-bold">Pro Plan ($49/mo)</span>
            <button className="text-sm underline">Change Plan</button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Login = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-10 shadow-2xl">
      <h2 className="text-3xl font-bold text-center mb-8">Welcome Back</h2>
      <div className="space-y-4">
        <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all" onClick={() => window.location.href='/dashboard'}>
          Sign In
        </button>
        <button className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl transition-all">
          Create Account
        </button>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="create" element={<CreateVideo />} />
        <Route path="videos" element={<MyVideos />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
