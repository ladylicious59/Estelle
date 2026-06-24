import React from 'react';
import { Video, Clock, TrendingUp, Play } from 'lucide-react';

const StatCard = ({ label, value, icon, trend }: { label: string, value: string, icon: React.ReactNode, trend: string }) => (
  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
    <div className="flex justify-between items-start mb-4">
      <div className="w-12 h-12 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center">
        {icon}
      </div>
      <span className="text-emerald-500 text-sm font-medium">{trend}</span>
    </div>
    <h3 className="text-slate-400 text-sm font-medium mb-1">{label}</h3>
    <p className="text-2xl font-bold">{value}</p>
  </div>
);

const Dashboard = () => {
  return (
    <div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Welcome back, Alex!</h1>
          <p className="text-slate-400">Here's what's happening with your videos.</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2">
          <Video size={18} />
          Create New Video
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard label="Total Videos" value="24" icon={<Video className="text-indigo-500" />} trend="+12%" />
        <StatCard label="Mins Used" value="45 / 60" icon={<Clock className="text-violet-500" />} trend="75%" />
        <StatCard label="Views" value="12.5k" icon={<TrendingUp className="text-amber-500" />} trend="+8%" />
        <StatCard label="Credits" value="15" icon={<Play className="text-emerald-500" />} trend="Active" />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="font-bold">Recent Videos</h2>
          <button className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">View All</button>
        </div>
        <div className="divide-y divide-slate-800">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 hover:bg-slate-800/50 transition-colors flex items-center gap-4">
              <div className="w-24 aspect-video bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                <Play size={20} className="text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">Product Announcement Reel #{i}</h4>
                <p className="text-xs text-slate-500">Created 2 hours ago • 0:45</p>
              </div>
              <div className="flex gap-2">
                <span className="px-2 py-1 bg-slate-800 text-slate-400 text-xs rounded uppercase font-bold tracking-wider">Draft</span>
                <button className="p-2 text-slate-400 hover:text-white transition-colors">
                  <Play size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
