import React, { useEffect, useState } from 'react';
import { Video, Clock, TrendingUp, Play, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import client from '../api/client';

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
  const { user } = useAuth();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [videosRes, subRes] = await Promise.all([
          client.get(`/videos?userId=${user?.id}`),
          client.get(`/subscriptions/status?userId=${user?.id}`)
        ]);
        setVideos(videosRes.data.videos || []);
        setSubscription(subRes.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  return (
    <div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name || user?.email.split('@')[0]}!</h1>
          <p className="text-slate-400">Here's what's happening with your videos.</p>
        </div>
        <Link 
          to="/dashboard/create" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2"
        >
          <Video size={18} />
          Create New Video
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard label="Total Videos" value={videos.length.toString()} icon={<Video className="text-indigo-500" />} trend="+0%" />
        <StatCard label="Plan" value={subscription?.plan?.toUpperCase() || 'NONE'} icon={<Clock className="text-violet-500" />} trend={subscription?.status || 'Inactive'} />
        <StatCard label="Views" value="0" icon={<TrendingUp className="text-amber-500" />} trend="+0%" />
        <StatCard label="Credits" value="--" icon={<Play className="text-emerald-500" />} trend="Active" />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="font-bold">Recent Videos</h2>
          <Link to="/dashboard/library" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">View All</Link>
        </div>
        <div className="divide-y divide-slate-800">
          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
          ) : videos.length > 0 ? (
            videos.slice(0, 5).map((video) => (
              <div key={video.id} className="p-4 hover:bg-slate-800/50 transition-colors flex items-center gap-4">
                <div className="w-24 aspect-video bg-slate-800 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                  {video.video_url ? (
                    <video src={video.video_url} className="w-full h-full object-cover" />
                  ) : (
                    <Play size={20} className="text-slate-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{video.input_text || 'Untitled Video'}</h4>
                  <p className="text-xs text-slate-500">Created {new Date(video.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 text-xs rounded uppercase font-bold tracking-wider ${
                    video.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                    video.status === 'failed' ? 'bg-red-500/10 text-red-500' :
                    'bg-amber-500/10 text-amber-500'
                  }`}>
                    {video.status}
                  </span>
                  {video.video_url && (
                    <a 
                      href={video.video_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 text-slate-400 hover:text-white transition-colors"
                    >
                      <Play size={18} />
                    </a>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-slate-500">
              <p>No videos yet. Create your first one!</p>
              <Link to="/dashboard/create" className="text-indigo-500 hover:underline mt-2 inline-block">
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
