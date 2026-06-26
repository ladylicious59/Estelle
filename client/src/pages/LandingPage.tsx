import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Video, MessageSquare, Zap, Shield, Smartphone, Loader2 } from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (plan: string) => {
    if (!user) {
      navigate('/login');
      return;
    }

    setLoadingPlan(plan);
    try {
      const response = await client.post('/subscriptions/create-checkout', {
        plan,
        userId: user.id,
        userEmail: user.email
      });
      
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (err) {
      console.error('Failed to create checkout session', err);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Video className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">TalkHuman AI</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          {user ? (
            <Link to="/dashboard" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg transition-all">
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="hover:text-white transition-colors">Login</Link>
              <Link to="/signup" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg transition-all">
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-20 pb-32 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
          Turn Text into <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Realistic AI Avatars</span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-12">
          High-engagement talking AI avatars for Instagram and Facebook. 
          No camera, no actors, no complex editing. Just tell us what to say.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link to="/dashboard" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all">
            Create Your First Video
          </Link>
          <button className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all">
            Watch Demo
          </button>
        </div>
        
        {/* Placeholder for hero image/video */}
        <div className="mt-20 relative max-w-5xl mx-auto">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-violet-600 rounded-2xl blur opacity-25"></div>
          <div className="relative bg-slate-900 rounded-2xl border border-slate-800 aspect-video flex items-center justify-center overflow-hidden">
            <div className="flex flex-col items-center gap-4 text-slate-500">
              <Video size={48} />
              <span>Preview Video Placeholder</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section id="features" className="bg-slate-900/50 py-32 border-y border-slate-900">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Why TalkHuman AI?</h2>
            <p className="text-slate-400">Everything you need to scale your social presence.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                icon: <MessageSquare className="text-indigo-500" />,
                title: "Text to Speech",
                desc: "Simply type your script and our AI will generate a realistic voice and lip-synced avatar."
              },
              {
                icon: <Smartphone className="text-violet-500" />,
                title: "Social Ready",
                desc: "Videos are optimized for Reels, Stories, and TikTok with the perfect aspect ratios."
              },
              {
                icon: <Zap className="text-amber-500" />,
                title: "Instant Results",
                desc: "Get your videos in seconds, not days. Iterate fast and post more often."
              }
            ].map((feature, i) => (
              <div key={i} className="p-8 bg-slate-900 border border-slate-800 rounded-2xl hover:border-indigo-500/50 transition-all">
                <div className="w-12 h-12 bg-slate-950 rounded-lg flex items-center justify-center mb-6 border border-slate-800">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section id="pricing" className="py-32">
        <div className="container mx-auto px-6 text-center">
          <div className="mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-slate-400">Choose the plan that's right for you.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Starter */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col text-left">
              <h3 className="text-xl font-bold mb-2">Starter</h3>
              <p className="text-slate-400 text-sm mb-6">Perfect for testing the waters.</p>
              <div className="mb-8">
                <span className="text-4xl font-bold">$19</span>
                <span className="text-slate-400">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-slate-300">
                  <Check size={18} className="text-indigo-500" /> 15 mins AI generation
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <Check size={18} className="text-indigo-500" /> Standard avatars
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <Check size={18} className="text-indigo-500" /> Basic editing
                </li>
              </ul>
              <button 
                onClick={() => handleSubscribe('starter')}
                disabled={loadingPlan === 'starter'}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl transition-all flex justify-center"
              >
                {loadingPlan === 'starter' ? <Loader2 className="animate-spin" /> : 'Get Started'}
              </button>
            </div>

            {/* Pro */}
            <div className="bg-slate-900 border-2 border-indigo-600 rounded-2xl p-8 flex flex-col text-left relative transform md:scale-105 shadow-2xl shadow-indigo-500/10">
              <div className="absolute top-0 right-8 -translate-y-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
                Most Popular
              </div>
              <h3 className="text-xl font-bold mb-2">Pro</h3>
              <p className="text-slate-400 text-sm mb-6">For serious creators and SMBs.</p>
              <div className="mb-8">
                <span className="text-4xl font-bold">$49</span>
                <span className="text-slate-400">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-slate-300">
                  <Check size={18} className="text-indigo-500" /> 60 mins AI generation
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <Check size={18} className="text-indigo-500" /> Custom voice cloning
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <Check size={18} className="text-indigo-500" /> HD Premium avatars
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <Check size={18} className="text-indigo-500" /> Priority processing
                </li>
              </ul>
              <button 
                onClick={() => handleSubscribe('pro')}
                disabled={loadingPlan === 'pro'}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-all flex justify-center"
              >
                {loadingPlan === 'pro' ? <Loader2 className="animate-spin" /> : 'Go Pro Now'}
              </button>
            </div>

            {/* Agency */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col text-left">
              <h3 className="text-xl font-bold mb-2">Agency</h3>
              <p className="text-slate-400 text-sm mb-6">Scale video for your clients.</p>
              <div className="mb-8">
                <span className="text-4xl font-bold">$149</span>
                <span className="text-slate-400">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-slate-300">
                  <Check size={18} className="text-indigo-500" /> 200 mins AI generation
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <Check size={18} className="text-indigo-500" /> Custom brand avatars
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <Check size={18} className="text-indigo-500" /> White-labeling
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <Check size={18} className="text-indigo-500" /> Dedicated support
                </li>
              </ul>
              <button 
                onClick={() => handleSubscribe('agency')}
                disabled={loadingPlan === 'agency'}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl transition-all flex justify-center"
              >
                {loadingPlan === 'agency' ? <Loader2 className="animate-spin" /> : 'Contact Sales'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="bg-indigo-600 py-20 mt-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">Ready to transform your social media?</h2>
          <Link to="/dashboard" className="inline-block bg-white text-indigo-600 px-10 py-4 rounded-xl font-bold text-xl hover:bg-slate-100 transition-all">
            Join TalkHuman AI Today
          </Link>
        </div>
      </section>

      <footer className="py-12 border-t border-slate-900">
        <div className="container mx-auto px-6 text-center text-slate-500 text-sm">
          <p>© 2026 TalkHuman AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
