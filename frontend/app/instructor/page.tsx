'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
  Brain, BookOpen, Plus, LogOut, Users, ChevronUp, ChevronDown,
  AlertTriangle, CheckCircle, TrendingUp, Loader2, X, BarChart3,
  GraduationCap, ClipboardList
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Course {
  _id: string;
  title: string;
  description: string;
  quizCount: number;
  createdAt: string;
}

interface Student {
  student_id: string;
  name: string;
  email: string;
  average_score: number;
  completion_percentage: number;
  quizzesCompleted: number;
  totalQuizzes: number;
  flag: 'On track' | 'At risk';
  riskProbability: number;
}

type SortKey = 'name' | 'average_score' | 'completion_percentage' | 'flag';

export default function InstructorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [token, setToken] = useState('');

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // Modals
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [showCreateQuiz, setShowCreateQuiz] = useState(false);

  // Forms
  const [courseForm, setCourseForm] = useState({ title: '', description: '' });
  const [quizForm, setQuizForm] = useState({ title: '', maxScore: '100' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const t = localStorage.getItem('et_token');
    const u = localStorage.getItem('et_user');
    if (!t || !u) { router.replace('/'); return; }
    const parsed = JSON.parse(u);
    if (parsed.role !== 'instructor') { router.replace('/student'); return; }
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

  useEffect(() => { if (token) loadCourses(); }, [token, loadCourses]);

  const loadDashboard = async (course: Course) => {
    setSelectedCourse(course);
    setStudents([]);
    setDashboardLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/dashboard/course/${course._id}`, { headers: authHeaders() });
      setStudents(data.students);
    } catch { setStudents([]); } finally { setDashboardLoading(false); }
  };

  const createCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true); setFormError('');
    try {
      await axios.post(`${API}/api/courses`, courseForm, { headers: authHeaders() });
      setShowCreateCourse(false);
      setCourseForm({ title: '', description: '' });
      loadCourses();
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: string } } };
      setFormError(axErr.response?.data?.error || 'Failed to create course.');
    } finally { setFormLoading(false); }
  };

  const createQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    setFormLoading(true); setFormError('');
    try {
      await axios.post(`${API}/api/quizzes`, {
        courseId: selectedCourse._id,
        title: quizForm.title,
        maxScore: parseInt(quizForm.maxScore) || 100
      }, { headers: authHeaders() });
      setShowCreateQuiz(false);
      setQuizForm({ title: '', maxScore: '100' });
      loadDashboard(selectedCourse);
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: string } } };
      setFormError(axErr.response?.data?.error || 'Failed to create quiz.');
    } finally { setFormLoading(false); }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sortedStudents = [...students].sort((a, b) => {
    const mult = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'name') return a.name.localeCompare(b.name) * mult;
    if (sortKey === 'average_score') return (a.average_score - b.average_score) * mult;
    if (sortKey === 'completion_percentage') return (a.completion_percentage - b.completion_percentage) * mult;
    if (sortKey === 'flag') return (a.flag === 'At risk' ? 1 : 0) * mult - (b.flag === 'At risk' ? 1 : 0) * mult;
    return 0;
  });

  const atRiskCount = students.filter(s => s.flag === 'At risk').length;
  const avgScore = students.length ? (students.reduce((a, s) => a + s.average_score, 0) / students.length).toFixed(1) : '—';
  const avgCompletion = students.length ? (students.reduce((a, s) => a + s.completion_percentage, 0) / students.length).toFixed(1) : '—';

  const SortIcon = ({ k }: { k: SortKey }) => sortKey === k
    ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
    : <span style={{ opacity: 0.3 }}><ChevronUp size={12} /></span>;

  const logout = () => { localStorage.clear(); router.replace('/'); };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Navbar */}
      <nav className="nav-bar">
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={18} color="white" />
            </div>
            <span style={{ fontWeight: '700', fontSize: '16px' }}>EduTrack Lite</span>
            <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)' }}>Instructor</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{user?.name}</span>
            <button className="btn-secondary" onClick={logout} style={{ padding: '7px 14px', fontSize: '13px' }}>
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px', display: 'flex', gap: '24px' }}>
        {/* Sidebar — Courses */}
        <div style={{ width: '280px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-secondary)' }}>MY COURSES</h2>
            <button id="open-create-course" className="btn-primary" onClick={() => { setShowCreateCourse(true); setFormError(''); }} style={{ padding: '6px 12px', fontSize: '12px' }}>
              <Plus size={14} /> New
            </button>
          </div>

          {courses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '13px' }}>
              <BookOpen size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              No courses yet.<br />Create your first one!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {courses.map(c => (
                <button key={c._id} onClick={() => loadDashboard(c)}
                  style={{
                    padding: '14px', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
                    background: selectedCourse?._id === c._id ? 'rgba(59,130,246,0.12)' : 'var(--bg-card)',
                    border: `1px solid ${selectedCourse?._id === c._id ? 'rgba(59,130,246,0.4)' : 'var(--border)'}`,
                    transition: 'all 0.2s'
                  }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.quizCount} quiz{c.quizCount !== 1 ? 'zes' : ''}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div style={{ flex: 1 }}>
          {!selectedCourse ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                <BarChart3 size={28} color="var(--text-muted)" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>Select a Course</div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Choose a course from the sidebar to view the at-risk dashboard</div>
              </div>
            </div>
          ) : (
            <div className="animate-fade-in">
              {/* Course Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{selectedCourse.title}</h1>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{selectedCourse.description}</p>
                </div>
                <button id="open-create-quiz" className="btn-primary" onClick={() => { setShowCreateQuiz(true); setFormError(''); }} style={{ flexShrink: 0 }}>
                  <ClipboardList size={15} /> Add Quiz
                </button>
              </div>

              {/* Stats Row */}
              {students.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                  {[
                    { label: 'Enrolled', value: students.length, icon: Users, color: '#3b82f6' },
                    { label: 'At Risk', value: atRiskCount, icon: AlertTriangle, color: '#ef4444' },
                    { label: 'Avg Score', value: `${avgScore}%`, icon: TrendingUp, color: '#10b981' },
                    { label: 'Avg Completion', value: `${avgCompletion}%`, icon: GraduationCap, color: '#8b5cf6' },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="glass-card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={18} color={color} />
                      </div>
                      <div>
                        <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)' }}>{value}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Student Risk Table */}
              <div className="glass-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Brain size={18} color="var(--accent-blue)" />
                  <span style={{ fontWeight: '600', fontSize: '15px' }}>At-Risk Student Dashboard</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '4px' }}>— ML-powered predictions via OULAD classifier</span>
                </div>

                {dashboardLoading ? (
                  <div style={{ padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                    <Loader2 size={28} color="var(--accent-blue)" style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Fetching predictions from ML service...</span>
                  </div>
                ) : students.length === 0 ? (
                  <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                    <Users size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                    No students enrolled yet.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          {([['name', 'Student'], ['average_score', 'Avg Score'], ['completion_percentage', 'Completion'], ['flag', 'Risk Flag']] as [SortKey, string][]).map(([k, label]) => (
                            <th key={k} onClick={() => handleSort(k)} style={{ paddingLeft: '20px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                {label} <SortIcon k={k} />
                              </span>
                            </th>
                          ))}
                          <th>Progress</th>
                          <th>Risk Prob.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedStudents.map(s => (
                          <tr key={s.student_id}>
                            <td style={{ paddingLeft: '20px' }}>
                              <div style={{ fontWeight: '600', marginBottom: '2px' }}>{s.name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.email}</div>
                            </td>
                            <td>
                              <span style={{ fontWeight: '600', color: s.average_score < 60 ? '#fca5a5' : '#6ee7b7' }}>
                                {s.average_score}%
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div className="progress-bar" style={{ width: '80px' }}>
                                  <div className="progress-fill" style={{ width: `${s.completion_percentage}%`, background: s.completion_percentage < 50 ? 'var(--gradient-danger)' : 'var(--gradient-primary)' }} />
                                </div>
                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{s.completion_percentage}%</span>
                              </div>
                            </td>
                            <td>
                              <span className={`badge-risk ${s.flag === 'At risk' ? 'badge-at-risk' : 'badge-on-track'}`}>
                                {s.flag === 'At risk' ? <AlertTriangle size={11} /> : <CheckCircle size={11} />}
                                {s.flag}
                              </span>
                            </td>
                            <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {s.quizzesCompleted}/{s.totalQuizzes} quizzes
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="progress-bar" style={{ width: '60px' }}>
                                  <div className="progress-fill" style={{ width: `${s.riskProbability * 100}%`, background: 'var(--gradient-danger)' }} />
                                </div>
                                <span style={{ fontSize: '12px', color: s.riskProbability > 0.5 ? '#fca5a5' : 'var(--text-muted)' }}>
                                  {(s.riskProbability * 100).toFixed(0)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Course */}
      {showCreateCourse && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
          <div className="glass-card animate-fade-in" style={{ width: '440px', padding: '28px', position: 'relative' }}>
            <button onClick={() => setShowCreateCourse(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Create New Course</h3>
            <form onSubmit={createCourse} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div><label>Course Title</label><input id="course-title" className="input-field" required value={courseForm.title} onChange={e => setCourseForm({ ...courseForm, title: e.target.value })} placeholder="e.g. Introduction to Python" /></div>
              <div><label>Description</label><textarea id="course-desc" className="input-field" required value={courseForm.description} onChange={e => setCourseForm({ ...courseForm, description: e.target.value })} placeholder="Brief course description..." /></div>
              {formError && <div style={{ color: '#fca5a5', fontSize: '13px' }}>{formError}</div>}
              <button id="submit-course" type="submit" className="btn-primary" disabled={formLoading} style={{ justifyContent: 'center' }}>
                {formLoading ? <span className="spinner" /> : <Plus size={16} />} Create Course
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Quiz */}
      {showCreateQuiz && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
          <div className="glass-card animate-fade-in" style={{ width: '400px', padding: '28px', position: 'relative' }}>
            <button onClick={() => setShowCreateQuiz(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Add Quiz to &ldquo;{selectedCourse?.title}&rdquo;</h3>
            <form onSubmit={createQuiz} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div><label>Quiz Title</label><input id="quiz-title" className="input-field" required value={quizForm.title} onChange={e => setQuizForm({ ...quizForm, title: e.target.value })} placeholder="e.g. Module 1 Assessment" /></div>
              <div><label>Max Score</label><input id="quiz-max-score" className="input-field" type="number" min="1" max="1000" value={quizForm.maxScore} onChange={e => setQuizForm({ ...quizForm, maxScore: e.target.value })} /></div>
              {formError && <div style={{ color: '#fca5a5', fontSize: '13px' }}>{formError}</div>}
              <button id="submit-quiz" type="submit" className="btn-primary" disabled={formLoading} style={{ justifyContent: 'center' }}>
                {formLoading ? <span className="spinner" /> : <ClipboardList size={16} />} Add Quiz
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
