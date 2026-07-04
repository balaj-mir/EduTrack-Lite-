'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
  Brain, BookOpen, LogOut, CheckCircle, AlertTriangle, TrendingUp,
  GraduationCap, Loader2, ChevronRight, BookMarked, Send
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Course {
  _id: string;
  title: string;
  description: string;
  instructor: { name: string; email: string };
  quizCount: number;
  enrolled: boolean;
}

interface QuizProgress {
  quizId: string;
  title: string;
  maxScore: number;
  score: number | null;
  submitted: boolean;
  submittedAt: string | null;
}

interface CourseProgress {
  courseId: string;
  courseTitle: string;
  courseDescription: string;
  averageScore: number;
  completionPercentage: number;
  quizzesCompleted: number;
  totalQuizzes: number;
  quizProgress: QuizProgress[];
}

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [token, setToken] = useState('');

  const [courses, setCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<CourseProgress[]>([]);
  const [activeTab, setActiveTab] = useState<'catalog' | 'progress'>('catalog');
  const [enrollLoading, setEnrollLoading] = useState<string | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);

  // Quiz submission
  const [submitModal, setSubmitModal] = useState<{ quiz: QuizProgress; courseId: string } | null>(null);
  const [scoreInput, setScoreInput] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('et_token');
    const u = localStorage.getItem('et_user');
    if (!t || !u) { router.replace('/'); return; }
    const parsed = JSON.parse(u);
    if (parsed.role !== 'student') { router.replace('/instructor'); return; }
    setToken(t);
    setUser(parsed);
  }, [router]);

  const authHeaders = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadCourses = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${API}/api/courses`, { headers: authHeaders() });
      setCourses(data.courses);
    } catch { /* ignore */ }
  }, [token, authHeaders]);

  const loadProgress = useCallback(async () => {
    if (!token) return;
    setProgressLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/dashboard/student`, { headers: authHeaders() });
      setProgress(data.progress);
    } catch { setProgress([]); } finally { setProgressLoading(false); }
  }, [token, authHeaders]);

  useEffect(() => {
    if (token) { loadCourses(); loadProgress(); }
  }, [token, loadCourses, loadProgress]);

  const enroll = async (courseId: string) => {
    setEnrollLoading(courseId);
    try {
      await axios.post(`${API}/api/courses/${courseId}/enroll`, {}, { headers: authHeaders() });
      loadCourses(); loadProgress();
    } catch { /* duplicate enroll — ignore */ } finally { setEnrollLoading(null); }
  };

  const submitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitModal) return;
    setSubmitLoading(true); setSubmitError('');
    const score = parseFloat(scoreInput);
    if (isNaN(score) || score < 0 || score > submitModal.quiz.maxScore) {
      setSubmitError(`Score must be between 0 and ${submitModal.quiz.maxScore}.`);
      setSubmitLoading(false); return;
    }
    try {
      await axios.post(`${API}/api/quizzes/${submitModal.quiz.quizId}/submit`, { score }, { headers: authHeaders() });
      setSubmitModal(null); setScoreInput('');
      loadProgress();
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: string } } };
      setSubmitError(axErr.response?.data?.error || 'Submission failed.');
    } finally { setSubmitLoading(false); }
  };

  const logout = () => { localStorage.clear(); router.replace('/'); };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Navbar */}
      <nav className="nav-bar">
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={18} color="white" />
            </div>
            <span style={{ fontWeight: '700', fontSize: '16px' }}>EduTrack Lite</span>
            <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.3)' }}>Student</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>👋 {user?.name}</span>
            <button className="btn-secondary" onClick={logout} style={{ padding: '7px 14px', fontSize: '13px' }}>
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-card)', borderRadius: '12px', padding: '4px', width: 'fit-content', marginBottom: '32px', border: '1px solid var(--border)' }}>
          {([['catalog', 'Course Catalog', BookOpen], ['progress', 'My Progress', TrendingUp]] as [typeof activeTab, string, typeof BookOpen][]).map(([tab, label, Icon]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                padding: '9px 20px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '7px',
                transition: 'all 0.2s',
                background: activeTab === tab ? 'var(--accent-blue)' : 'transparent',
                color: activeTab === tab ? 'white' : 'var(--text-secondary)',
              }}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* Course Catalog */}
        {activeTab === 'catalog' && (
          <div className="animate-fade-in">
            <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-primary)' }}>
              Available Courses
            </h1>
            {courses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
                <BookOpen size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                <div>No courses available yet.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {courses.map(c => (
                  <div key={c._id} className="glass-card" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <BookMarked size={18} color="var(--accent-blue)" />
                      </div>
                      {c.enrolled && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#6ee7b7', fontWeight: '600' }}>
                          <CheckCircle size={13} /> Enrolled
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontWeight: '700', fontSize: '16px', marginBottom: '6px', color: 'var(--text-primary)' }}>{c.title}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: '1.5' }}>{c.description}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {c.quizCount} quiz{c.quizCount !== 1 ? 'zes' : ''} · {c.instructor?.name}
                      </span>
                      {!c.enrolled ? (
                        <button id={`enroll-${c._id}`} className="btn-primary" onClick={() => enroll(c._id)}
                          disabled={enrollLoading === c._id} style={{ padding: '7px 14px', fontSize: '13px' }}>
                          {enrollLoading === c._id ? <span className="spinner" style={{ width: '14px', height: '14px' }} /> : <ChevronRight size={15} />}
                          Enroll
                        </button>
                      ) : (
                        <button className="btn-secondary" onClick={() => setActiveTab('progress')} style={{ padding: '7px 14px', fontSize: '13px' }}>
                          View Progress <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Progress */}
        {activeTab === 'progress' && (
          <div className="animate-fade-in">
            <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-primary)' }}>
              My Progress
            </h1>
            {progressLoading ? (
              <div style={{ textAlign: 'center', padding: '80px' }}>
                <Loader2 size={28} color="var(--accent-blue)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
              </div>
            ) : progress.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
                <GraduationCap size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                <div>You haven&apos;t enrolled in any courses yet.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {progress.map(p => (
                  <div key={p.courseId} className="glass-card" style={{ padding: '24px' }}>
                    {/* Course Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px' }}>{p.courseTitle}</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{p.courseDescription}</p>
                      </div>
                      <span className={`badge-risk ${(p.averageScore < 60 || p.completionPercentage < 50) ? 'badge-at-risk' : 'badge-on-track'}`}>
                        {(p.averageScore < 60 || p.completionPercentage < 50) ? <AlertTriangle size={11} /> : <CheckCircle size={11} />}
                        {(p.averageScore < 60 || p.completionPercentage < 50) ? 'Needs Attention' : 'On Track'}
                      </span>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
                      {[
                        { label: 'Avg Score', value: `${p.averageScore}%`, color: p.averageScore >= 70 ? '#10b981' : p.averageScore >= 50 ? '#f59e0b' : '#ef4444' },
                        { label: 'Completion', value: `${p.completionPercentage}%`, color: '#3b82f6' },
                        { label: 'Quizzes Done', value: `${p.quizzesCompleted}/${p.totalQuizzes}`, color: '#8b5cf6' },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '20px', fontWeight: '700', color, marginBottom: '4px' }}>{value}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Overall progress bar */}
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        <span>Overall Completion</span><span>{p.completionPercentage}%</span>
                      </div>
                      <div className="progress-bar" style={{ height: '8px' }}>
                        <div className="progress-fill" style={{ width: `${p.completionPercentage}%` }} />
                      </div>
                    </div>

                    {/* Quizzes */}
                    {p.quizProgress.length > 0 && (
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quizzes</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {p.quizProgress.map(q => (
                            <div key={q.quizId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {q.submitted
                                  ? <CheckCircle size={16} color="#10b981" />
                                  : <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid var(--border-light)' }} />
                                }
                                <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{q.title}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {q.submitted ? (
                                  <span style={{ fontSize: '13px', color: '#6ee7b7', fontWeight: '600' }}>
                                    {q.score}/{q.maxScore} pts
                                  </span>
                                ) : (
                                  <button id={`submit-quiz-${q.quizId}`} className="btn-primary"
                                    onClick={() => { setSubmitModal({ quiz: q, courseId: p.courseId }); setScoreInput(''); setSubmitError(''); }}
                                    style={{ padding: '6px 12px', fontSize: '12px' }}>
                                    <Send size={12} /> Submit Score
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Submit Score */}
      {submitModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
          <div className="glass-card animate-fade-in" style={{ width: '380px', padding: '28px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>Submit Quiz Score</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>{submitModal.quiz.title}</p>
            <form onSubmit={submitScore} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label>Your Score (out of {submitModal.quiz.maxScore})</label>
                <input id="score-input" className="input-field" type="number" min="0" max={submitModal.quiz.maxScore} step="0.1" required value={scoreInput} onChange={e => setScoreInput(e.target.value)} placeholder={`0 – ${submitModal.quiz.maxScore}`} autoFocus />
              </div>
              {submitError && <div style={{ color: '#fca5a5', fontSize: '13px' }}>{submitError}</div>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setSubmitModal(null)} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                <button id="confirm-submit" type="submit" className="btn-primary" disabled={submitLoading} style={{ flex: 1, justifyContent: 'center' }}>
                  {submitLoading ? <span className="spinner" style={{ width: '14px', height: '14px' }} /> : <Send size={14} />} Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
