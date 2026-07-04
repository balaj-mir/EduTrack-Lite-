'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
  BookOpen, GraduationCap, Brain, TrendingUp,
  CheckCircle, AlertTriangle, ChevronRight, Zap
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'instructor' | 'student'>('student');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('et_token');
    const userStr = localStorage.getItem('et_user');
    if (token && userStr) {
      const user = JSON.parse(userStr);
      router.replace(user.role === 'instructor' ? '/instructor' : '/student');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = mode === 'login'
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password, role };
      const { data } = await axios.post(`${API}${endpoint}`, payload);
      localStorage.setItem('et_token', data.token);
      localStorage.setItem('et_user', JSON.stringify(data.user));
      router.push(data.user.role === 'instructor' ? '/instructor' : '/student');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-primary)' }}>
      {/* Left Panel */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px', background: 'linear-gradient(160deg, #0f1629 0%, #0a0e1a 100%)',
        borderRight: '1px solid var(--border)', position: 'relative', overflow: 'hidden'
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute', top: '-100px', left: '-100px',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', bottom: '-80px', right: '-80px',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'var(--gradient-primary)', display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}>
              <Brain size={22} color="white" />
            </div>
            <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>
              EduTrack Lite
            </span>
          </div>

          <h1 style={{ fontSize: '40px', fontWeight: '800', lineHeight: '1.2', marginBottom: '20px' }}>
            <span style={{ color: 'var(--text-primary)' }}>Smart Learning,</span><br />
            <span className="gradient-text">Risk-Aware Teaching</span>
          </h1>
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '48px', maxWidth: '420px' }}>
            An AI-powered course platform that uses a Logistic Regression classifier trained on the OULAD dataset to automatically flag at-risk students.
          </p>

          {[
            { icon: BookOpen, color: '#3b82f6', title: 'Course Management', desc: 'Create courses and quizzes with ease' },
            { icon: AlertTriangle, color: '#f59e0b', title: 'At-Risk Detection', desc: 'ML model flags struggling students in real-time' },
            { icon: TrendingUp, color: '#10b981', title: 'Progress Tracking', desc: 'Visual dashboards for students and instructors' },
          ].map(({ icon: Icon, color, title, desc }) => (
            <div key={title} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                background: `${color}18`, border: `1px solid ${color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Icon size={18} color={color} />
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '2px' }}>{title}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel — Auth Form */}
      <div style={{
        width: '480px', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px 50px', background: 'var(--bg-secondary)'
      }}>
        <h2 style={{ fontSize: '26px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' }}>
          {mode === 'login' ? 'Sign in to continue to EduTrack Lite' : 'Join EduTrack Lite today'}
        </p>

        {/* Mode Toggle */}
        <div style={{
          display: 'flex', background: 'var(--bg-card)', borderRadius: '10px',
          padding: '4px', marginBottom: '28px', border: '1px solid var(--border)'
        }}>
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); }}
              style={{
                flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                cursor: 'pointer', fontSize: '14px', fontWeight: '500', transition: 'all 0.2s',
                background: mode === m ? 'var(--accent-blue)' : 'transparent',
                color: mode === m ? 'white' : 'var(--text-secondary)',
              }}>
              {m === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {mode === 'register' && (
            <>
              <div>
                <label>Full Name</label>
                <input id="auth-name" className="input-field" type="text" placeholder="Jane Smith" required
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              {/* Role Selection */}
              <div>
                <label>I am a...</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {(['student', 'instructor'] as const).map(r => (
                    <button key={r} type="button" onClick={() => setRole(r)}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '10px', cursor: 'pointer',
                        border: `1px solid ${role === r ? 'var(--accent-blue)' : 'var(--border)'}`,
                        background: role === r ? 'rgba(59,130,246,0.1)' : 'var(--bg-card)',
                        color: role === r ? 'var(--accent-blue)' : 'var(--text-secondary)',
                        fontWeight: '500', fontSize: '14px', display: 'flex',
                        flexDirection: 'column', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
                      }}>
                      {r === 'student' ? <GraduationCap size={20} /> : <BookOpen size={20} />}
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                      {role === r && <CheckCircle size={14} />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <label>Email Address</label>
            <input id="auth-email" className="input-field" type="email" placeholder="you@example.com" required
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label>Password</label>
            <input id="auth-password" className="input-field" type="password" placeholder="••••••••" required
              minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#fca5a5',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          <button id="auth-submit" type="submit" className="btn-primary" disabled={loading}
            style={{ marginTop: '4px', justifyContent: 'center', padding: '13px' }}>
            {loading ? <span className="spinner" /> : <Zap size={16} />}
            {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '28px', lineHeight: '1.6' }}>
          Powered by a Logistic Regression classifier trained on the Open University Learning Analytics Dataset (OULAD)
        </p>
      </div>
    </div>
  );
}
