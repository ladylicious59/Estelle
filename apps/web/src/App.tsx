import { useState, useEffect, useRef } from 'react';

const API = '/api';

interface Plan {
  key: string;
  name: string;
  desc: string;
  price: number;
  credits: string;
  features: string[];
  popular?: boolean;
}

const PLANS: Plan[] = [
  { key: 'starter', name: 'Starter', desc: 'Perfect for testing the waters.', price: 19, credits: '15 mins', features: ['15 mins AI generation', 'Standard avatars', 'Basic editing'] },
  { key: 'pro', name: 'Pro', desc: 'For serious creators and SMBs.', price: 49, credits: '60 mins', popular: true, features: ['60 mins AI generation', 'Custom voice cloning', 'HD Premium avatars', 'Priority processing'] },
  { key: 'agency', name: 'Agency', desc: 'Scale video for your clients.', price: 149, credits: '200 mins', features: ['200 mins AI generation', 'Custom brand avatars', 'White-labeling', 'Dedicated support'] },
];

export default function App() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  // unused - PayPal SDK handles order state internally
  const paypalBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedPlan && (window as any).paypal && paypalBtnRef.current) {
      paypalBtnRef.current.innerHTML = '';
      (window as any).paypal.Buttons({
        createOrder: async () => {
          setStatus('loading');
          const res = await fetch(`${API}/payments/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: selectedPlan }),
          });
          const data = await res.json();
          if (!data.id) throw new Error('Failed to create order');
          return data.id;
        },
        onApprove: async (data: any) => {
          const res = await fetch(`${API}/payments/capture-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: data.orderID }),
          });
          const capture = await res.json();
          if (capture.status === 'COMPLETED') {
            setStatus('success');
          } else {
            setStatus('error');
          }
        },
        onCancel: () => {
          setSelectedPlan(null);
          setStatus('idle');
        },
        onError: (err: any) => {
          console.error('PayPal error:', err);
          setStatus('error');
        },
      }).render(paypalBtnRef.current);
    }
  }, [selectedPlan]);

  return (
    <div style={{
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      background: '#0f172a',
      color: '#e2e8f0',
      minHeight: '100vh',
    }}>
      {/* Nav */}
      <nav style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎬</div>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>TalkHuman AI</span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <a href="#features" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Features</a>
          <a href="#pricing" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Pricing</a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-2px', marginBottom: 24 }}>
          Turn Text into{' '}
          <span style={{ background: 'linear-gradient(135deg, #818cf8, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Realistic AI Avatars
          </span>
        </h1>
        <p style={{ fontSize: 18, color: '#94a3b8', maxWidth: 600, margin: '0 auto 48px', lineHeight: 1.6 }}>
          High-engagement talking AI avatars for Instagram and Facebook. No camera, no actors, no complex editing.
        </p>
        <a href="#pricing" style={{ display: 'inline-block', background: '#6366f1', color: 'white', padding: '16px 40px', borderRadius: 12, fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>
          Create Your First Video
        </a>
      </section>

      {/* Features */}
      <section id="features" style={{ background: '#1e293b', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, textAlign: 'center', marginBottom: 48, letterSpacing: '-1px' }}>Why TalkHuman AI?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {[
              { icon: '💬', title: 'Text to Speech', desc: 'Type your script and our AI generates realistic voice and lip-synced avatar.' },
              { icon: '📱', title: 'Social Ready', desc: 'Optimized for Reels, Stories, and TikTok with perfect aspect ratios.' },
              { icon: '⚡', title: 'Instant Results', desc: 'Get videos in seconds, not days. Iterate fast and post more often.' },
            ].map((f, i) => (
              <div key={i} style={{ background: '#0f172a', borderRadius: 16, padding: 32, border: '1px solid #334155' }}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ color: '#94a3b8', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, textAlign: 'center', marginBottom: 8, letterSpacing: '-1px' }}>Simple, Transparent Pricing</h2>
          <p style={{ color: '#94a3b8', textAlign: 'center', marginBottom: 48 }}>Choose the plan that's right for you.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, maxWidth: 1000, margin: '0 auto' }}>
            {PLANS.map((plan) => (
              <div key={plan.key} style={{
                background: '#1e293b',
                borderRadius: 16,
                padding: 32,
                border: plan.popular ? '2px solid #6366f1' : '1px solid #334155',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}>
                {plan.popular && <div style={{ position: 'absolute', top: -12, right: 24, background: '#6366f1', color: 'white', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 1 }}>Most Popular</div>}
                <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{plan.name}</h3>
                <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 16 }}>{plan.desc}</p>
                <div style={{ marginBottom: 24 }}>
                  <span style={{ fontSize: 40, fontWeight: 800 }}>${plan.price}</span>
                  <span style={{ color: '#94a3b8' }}>/mo</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', flex: 1 }}>
                  <li style={{ padding: '8px 0', color: '#cbd5e1', fontSize: 14 }}>
                    <span style={{ color: '#6366f1', marginRight: 8 }}>✓</span>
                    {plan.credits} AI generation
                  </li>
                  {plan.features.map((f, i) => (
                    <li key={i} style={{ padding: '8px 0', color: '#cbd5e1', fontSize: 14 }}>
                      <span style={{ color: '#6366f1', marginRight: 8 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                {selectedPlan === plan.key ? (
                  status === 'success' ? (
                    <div style={{ textAlign: 'center', padding: 12, background: '#065f46', borderRadius: 12, color: '#6ee7b7', fontWeight: 600 }}>✅ Payment successful!</div>
                  ) : status === 'error' ? (
                    <div style={{ textAlign: 'center', padding: 12, background: '#7f1d1d', borderRadius: 12, color: '#fca5a5', fontWeight: 600 }}>❌ Payment failed. Try again.</div>
                  ) : (
                    <div ref={paypalBtnRef} />
                  )
                ) : (
                  <button onClick={() => { setSelectedPlan(plan.key); setStatus('idle'); }} style={{
                    width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                    background: plan.popular ? '#6366f1' : '#334155', color: 'white', transition: 'all 0.2s',
                  }}>
                    {plan.key === 'agency' ? 'Contact Sales' : plan.key === 'starter' ? 'Get Started' : 'Go Pro Now'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #1e293b', padding: '24px', textAlign: 'center', color: '#475569', fontSize: 14 }}>
        <p>© 2026 TalkHuman AI. All rights reserved.</p>
      </footer>
    </div>
  );
}