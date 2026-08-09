import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Antigravity from './Antigravity';
import WaviyText from './WaviyText';
import LampLight from './LampLight';
import DopaCore from './DopaCore';
import TargetCursor from './TargetCursor';
import './index.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

let globalAudioCtx = null;
const playTypingSound = () => {
  try {
    if (!globalAudioCtx) {
      globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume();
    }
    
    const ctx = globalAudioCtx;
    const bufferSize = ctx.sampleRate * 0.015; // 15ms short click
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1; 
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200 + Math.random() * 800; // slightly randomize pitch
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, ctx.currentTime); // increased volume (20%)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.015);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    noise.start();
  } catch (e) {
    // ignore if audio context is blocked
  }
};

const TypewriterMessage = ({ text }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      
      // Play sound almost every character for a rapid hacker feel
      if (i % 2 === 0) {
        playTypingSound();
      }
      
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 10); // 10ms per character for blazing fast speed
    
    return () => clearInterval(interval);
  }, [text]);

  return (
    <>
      {displayedText}
      <span className={displayedText.length < text.length ? 'blinking-cursor typing' : 'blinking-cursor done'}></span>
    </>
  );
};

const FormattedMessage = ({ text }) => {
  const parts = text.split('\n\n').filter(p => p.trim());
  if (parts.length <= 1) {
     return <div className="actual-question"><TypewriterMessage text={text} /></div>;
  }
  const questionPart = parts.pop();
  const contextPart = parts.join('\n\n');

  return (
    <div>
      <div className="context-text"><TypewriterMessage text={contextPart} /></div>
      <div className="question-header">QUESTION</div>
      <div className="actual-question"><TypewriterMessage text={questionPart} /></div>
    </div>
  );
};

const RevealOnScroll = ({ children, delay = 0, className = "" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -50px 0px', threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
};

const SidebarStatsPanel = () => {
  const [candidates, setCandidates] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/candidates`)
      .then(res => res.json())
      .then(data => setCandidates(data))
      .catch(console.error);
  }, []);

  if (!candidates || candidates.length === 0) return null;

  const totalCandidates = candidates.length;
  const totalCompleted = candidates.reduce((sum, c) => sum + (c.signals?.missionsCompleted || 0), 0);
  const avgCompleted = Math.round(totalCompleted / totalCandidates);

  const skippedCounts = {};
  candidates.forEach(c => {
    (c.missions || []).forEach(m => {
      if (m.skipped) {
        skippedCounts[m.day] = (skippedCounts[m.day] || 0) + 1;
      }
    });
  });

  let maxSkippedDay = 14;
  let maxSkippedCount = -1;
  Object.entries(skippedCounts).forEach(([day, count]) => {
    if (count > maxSkippedCount) {
      maxSkippedCount = count;
      maxSkippedDay = day;
    }
  });

  return (
    <div className="sidebar-stats-card glass-card" style={{
      marginTop: 'auto',
      padding: '14px 16px',
      borderRadius: '12px',
      background: 'rgba(17, 24, 39, 0.55)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      <div style={{ fontSize: '0.7rem', color: '#a78bfa', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cohort Live Signals</div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
        <span style={{ color: '#94a3b8' }}>Total Candidates</span>
        <span style={{ color: 'white', fontWeight: 'bold' }}>{totalCandidates}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
        <span style={{ color: '#94a3b8' }}>Avg Missions</span>
        <span style={{ color: '#34d399', fontWeight: 'bold' }}>{avgCompleted}/31</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
        <span style={{ color: '#94a3b8' }}>Most Skipped</span>
        <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>Day {maxSkippedDay}</span>
      </div>
    </div>
  );
};

const Sidebar = ({ activePage }) => {
  const navigate = useNavigate();
  return (
    <aside className="dashboard-sidebar" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div className="sidebar-logo" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }} onClick={() => navigate('/')}>
        <img src="/logo.jpg" alt="Logo" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }} />
        <span>AI Cohort Agent</span>
      </div>
      <nav className="sidebar-nav">
        <div className={`nav-item ${activePage === 'home' ? 'active' : ''}`} onClick={() => navigate('/')}>
          <span>Home</span>
        </div>
        <div className={`nav-item ${activePage === 'overview' ? 'active' : ''}`} onClick={() => navigate('/overview')}>
          <span>Overview</span>
        </div>
        <div className={`nav-item ${activePage === 'candidates' ? 'active' : ''}`} onClick={() => navigate('/candidates')}>
          <span>Candidates</span>
        </div>
        <div className={`nav-item ${activePage === 'interviews' ? 'active' : ''}`} onClick={() => navigate('/interviews')}>
          <span>Interviews</span>
        </div>
        <div className={`nav-item ${activePage === 'reports' ? 'active' : ''}`} onClick={() => navigate('/reports')}>
          <span>Reports</span>
        </div>
      </nav>
      <SidebarStatsPanel />
    </aside>
  );
};

function LandingPage() {
  const [stats, setStats] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem('interviewer_name');
    if (savedUser) {
      setIsLoggedIn(true);
      setUsername(savedUser);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (username.trim() && email.trim() && password.trim()) {
      localStorage.setItem('interviewer_name', username.trim());
      localStorage.setItem('interviewer_email', email.trim());
      setIsLoggedIn(true);
      setShowModal(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('interviewer_name');
    localStorage.removeItem('interviewer_email');
    setIsLoggedIn(false);
    setUsername('');
    setEmail('');
    setPassword('');
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/stats`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error);
  }, []);

  return (
    <div className="landing-page-layout">
      <main className="hero-section">
        <div className="hero-content">
          <WaviyText text="AI COHORT INTERVIEW AGENT" />
          <p className="hero-desc">
            Conducts adaptive technical interviews based on a<br/>candidate's actual cohort progress.<br/><br/>
            Powered by a real-time<br/>Retrieval-Augmented Generation (RAG) Brain.
          </p>

          <div className="hero-action-box glass-welcome-card">
            <div className="action-box-inner" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
              {isLoggedIn && <div className="action-text">Welcome back, {username}</div>}
              <button className="primary-btn hero-btn" onClick={() => navigate('/overview')}>
                Enter AI System &rarr;
              </button>
              {isLoggedIn ? (
                <button className="logout-text-link" onClick={handleLogout}>
                  Logout
                </button>
              ) : (
                <button className="logout-text-link" onClick={() => setShowModal(true)} style={{ color: '#a78bfa', cursor: 'pointer', background: 'none', border: 'none', fontSize: '0.9rem' }}>
                  Interviewer Login
                </button>
              )}
            </div>
          </div>
          
          <div className="hero-logo-showcase floating-logo-container">
            <img src="/logo.jpg" alt="AI Cohort Logo" className="floating-logo-img" />
          </div>

          {stats && (
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-number">{stats.candidates}</span>
                <span className="stat-label">Candidates</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{stats.days}</span>
                <span className="stat-label">Day Curriculum</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">True RAG</span>
                <span className="stat-label">Vector Search Brain</span>
              </div>
            </div>
          )}
        </div>
      </main>

      <section className="features-section" style={{ padding: '100px 10%', background: 'rgba(0,0,0,0.8)', zIndex: 10 }}>
        <RevealOnScroll>
          <h2 style={{ fontSize: '3rem', textAlign: 'center', margin: '0 0 60px 0', color: 'white' }}>Enterprise-Grade Intelligence</h2>
        </RevealOnScroll>
        <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
          <RevealOnScroll delay={0.1}>
            <div className="feature-card glass-card" style={{ padding: '40px', textAlign: 'center', height: '100%' }}>
              <h3 style={{ color: 'var(--accent)', fontSize: '1.5rem', marginBottom: '16px' }}>True RAG Brain</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>We don't just stuff context. Our backend uses Google Gemini's text-embedding-004 to mathematically vector search the curriculum during the interview in real-time.</p>
            </div>
          </RevealOnScroll>
          <RevealOnScroll delay={0.2}>
            <div className="feature-card glass-card" style={{ padding: '40px', textAlign: 'center', height: '100%' }}>
              <h3 style={{ color: 'var(--accent)', fontSize: '1.5rem', marginBottom: '16px' }}>Philosophical Personas</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>Tired of boring bots? Get grilled by Socrates or Friedrich Nietzsche. Our system prompts dynamically adapt to interview the candidate in their unique style.</p>
            </div>
          </RevealOnScroll>
          <RevealOnScroll delay={0.3}>
            <div className="feature-card glass-card" style={{ padding: '40px', textAlign: 'center', height: '100%' }}>
              <h3 style={{ color: 'var(--accent)', fontSize: '1.5rem', marginBottom: '16px' }}>Adaptive Difficulty</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>The AI reads the candidate's GitHub commit history and mission attempts to perfectly calibrate the starting difficulty of every question.</p>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      <section className="how-it-works-section" style={{ padding: '100px 10%', zIndex: 10 }}>
        <h2 style={{ fontSize: '3rem', textAlign: 'center', marginBottom: '60px' }}>How It Works</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
          <div className="glass-card" style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ background: 'var(--accent)', color: 'white', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>1</div>
            <div>
              <h4 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Select Candidate & Persona</h4>
              <p style={{ color: 'var(--text-secondary)' }}>Choose a candidate profile and decide who will interview them (e.g., Sun Tzu).</p>
            </div>
          </div>
          <div className="glass-card" style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ background: 'var(--accent)', color: 'white', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>2</div>
            <div>
              <h4 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>RAG Embedding Search</h4>
              <p style={{ color: 'var(--text-secondary)' }}>As you chat, the backend runs a Cosine Similarity Search against our Vector DB to find the exact curriculum concepts.</p>
            </div>
          </div>
          <div className="glass-card" style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ background: 'var(--accent)', color: 'white', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>3</div>
            <div>
              <h4 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Adaptive Interviewing</h4>
              <p style={{ color: 'var(--text-secondary)' }}>The AI formulates a question using the retrieved context and the candidate's exact experience level.</p>
            </div>
          </div>
        </div>
      </section>


      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
            <form onSubmit={handleLogin} className="login-form" style={{ width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ marginBottom: '8px', marginTop: 0, color: 'var(--text-primary)' }}>Interviewer Login</h2>
              <input 
                type="email" 
                className="login-input typewriter-input" 
                placeholder="Enter your Gmail" 
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  playTypingSound();
                }}
                required
              />
              <input 
                type="password" 
                className="login-input typewriter-input" 
                placeholder="Enter your password" 
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  playTypingSound();
                }}
                required
              />
              <input 
                type="text" 
                className="login-input typewriter-input" 
                placeholder="Enter your name" 
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  playTypingSound();
                }}
                required
              />
              <button type="submit" className="login-btn" style={{ marginTop: '8px' }}>Log In</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CandidateSelection() {
  const [candidates, setCandidates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('name-asc');
  const [interviewerType, setInterviewerType] = useState('standard');
  const persona = 'socrates';
  
  // Custom Candidate State
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [customExp, setCustomExp] = useState(2);
  const [customEdu, setCustomEdu] = useState("B.S. Computer Science");
  const [customCommitDays, setCustomCommitDays] = useState('');
  const [curriculumDays, setCurriculumDays] = useState([]);
  const [missionSelections, setMissionSelections] = useState({});
  const [submittingCustom, setSubmittingCustom] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_BASE}/api/candidates`)
      .then(res => res.json())
      .then(data => setCandidates(data))
      .catch(err => console.error("Error fetching candidates", err));

    fetch(`${API_BASE}/api/curriculum`)
      .then(res => res.json())
      .then(data => setCurriculumDays(data.days || []))
      .catch(err => console.error("Error fetching curriculum", err));
  }, []);

  const filteredAndSorted = candidates
    .filter(c => c.member.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === 'name-asc') return a.member.name.localeCompare(b.member.name);
      if (sortOrder === 'name-desc') return b.member.name.localeCompare(a.member.name);
      if (sortOrder === 'exp-asc') return a.member.yearsExperience - b.member.yearsExperience;
      if (sortOrder === 'exp-desc') return b.member.yearsExperience - a.member.yearsExperience;
      return 0;
    });

  const handleCustomSubmit = async (e) => {
    e.preventDefault();
    if (!customName.trim() || !customRole.trim() || submittingCustom) return;
    setSubmittingCustom(true);
    
    const missions = [];
    const daysList = curriculumDays.length > 0 ? curriculumDays : Array.from({ length: 31 }, (_, i) => ({ day: i + 1, topics: [`Module Day ${i + 1}`] }));
    
    daysList.forEach(d => {
      const selection = missionSelections[d.day] || { status: 'passed', attempts: 1 };
      if (selection.status === 'passed') {
        missions.push({
          day: d.day,
          title: d.topics?.[0] || d.title || `Day ${d.day} Mission`,
          passed: true,
          attempts: Number(selection.attempts || 1)
        });
      } else if (selection.status === 'skipped') {
        missions.push({
          day: d.day,
          title: d.topics?.[0] || d.title || `Day ${d.day} Mission`,
          skipped: true
        });
      }
    });

    try {
      const res = await fetch(`${API_BASE}/api/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customName,
          jobRole: customRole,
          yearsExperience: customExp,
          education: customEdu,
          missions,
          commitDays: customCommitDays
        })
      });
      const resData = await res.json();
      if (resData.candidate) {
        setCandidates(prev => [resData.candidate, ...prev]);
      }
    } catch (err) {
      console.error("Error submitting custom candidate:", err);
    } finally {
      setSubmittingCustom(false);
      setShowCustomModal(false);
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar activePage="candidates" />

      <main className="dashboard-main">
        <TargetCursor 
          targetSelector=".candidate-card, .dashboard-button, button, a" 
          cursorColor="#a78bfa" 
          cursorColorOnTarget="#fff"
        />
        <div className="dashboard-header">
          <div className="dashboard-title">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
              <div>
                <span className="workspace-label">AI INTERVIEW WORKSPACE</span>
                <h1>Candidates</h1>
                <p>Select a candidate to begin their adaptive technical interview.</p>
              </div>
              <button 
                onClick={() => setShowCustomModal(true)} 
                className="primary-btn" 
                style={{ fontSize: '0.9rem', padding: '10px 24px', borderRadius: '8px', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                + Create Custom Candidate
              </button>
            </div>
          </div>
          
          <div className="filter-sort-bar">
            <input 
              type="text" 
              placeholder="Search candidates by name..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="search-input"
            />
            <select 
              value={sortOrder} 
              onChange={e => setSortOrder(e.target.value)}
              className="sort-select"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="exp-asc">Experience (Low to High)</option>
              <option value="exp-desc">Experience (High to Low)</option>
            </select>
            <select 
              value={interviewerType} 
              onChange={e => setInterviewerType(e.target.value)}
              className="sort-select interviewer-type-select"
              style={{ borderColor: 'rgba(139, 92, 246, 0.4)', background: 'rgba(139, 92, 246, 0.1)', color: '#c084fc', fontWeight: 'bold' }}
            >
              <option value="standard">Interviewer: Standard</option>
              <option value="deep_dive">Interviewer: Deep Dive</option>
              <option value="friendly">Interviewer: Friendly</option>
            </select>
          </div>
        </div>

        <div className="candidate-grid">
          {filteredAndSorted.length > 0 ? (
            filteredAndSorted.map((c, index) => (
              <RevealOnScroll key={c.member.id} delay={(index % 10) * 0.1}>
                <div 
                  onClick={() => navigate('/interview', { state: { candidate: c, persona, interviewerType } })} 
                  className="candidate-grid-card"
                >
                  <div className="candidate-header-row">
                    <div className="candidate-avatar">
                      {c.member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="candidate-status">
                      <span className="candidate-status-dot"></span> Ready
                    </div>
                  </div>
                  
                  <div className="candidate-info">
                    <div className="candidate-name">{c.member.name}</div>
                    <div className="candidate-role">{c.member.jobRole}</div>
                  </div>

                  {/* Completion Signal Progress Bar */}
                  <div className="completion-signal" style={{ margin: '14px 0 8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px', fontWeight: '600' }}>
                      <span>Cohort Progress</span>
                      <span style={{ color: '#a78bfa' }}>{c.signals?.missionsCompleted || 0}/31 Missions</span>
                    </div>
                    <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(100, Math.round(((c.signals?.missionsCompleted || 0) / 31) * 100))}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #a78bfa 0%, #34d399 100%)',
                        borderRadius: '3px',
                        boxShadow: '0 0 8px rgba(167, 139, 250, 0.4)'
                      }} />
                    </div>
                  </div>

                  <div className="candidate-stats">
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span className="experience-pill">{c.member.yearsExperience} YOE</span>
                    </div>
                    <span className="start-action">Start Interview &rarr;</span>
                  </div>
                </div>
              </RevealOnScroll>
            ))
          ) : (
            <div className="no-candidates">No candidates found matching your criteria.</div>
          )}
        </div>

        {showCustomModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '640px', maxHeight: '85vh', overflowY: 'auto' }}>
              <button className="close-btn" onClick={() => setShowCustomModal(false)}>&times;</button>
              <form onSubmit={handleCustomSubmit} className="login-form" style={{ width: '100%', maxWidth: '100%' }}>
                <h2 style={{ marginBottom: '16px', marginTop: 0, color: 'var(--text-primary)' }}>Create Custom Candidate</h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Name</label>
                    <input type="text" className="login-input" value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Candidate Full Name" required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Job Role</label>
                    <input type="text" className="login-input" value={customRole} onChange={e => setCustomRole(e.target.value)} placeholder="e.g. AI Engineer" required />
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>YOE</label>
                    <input type="number" className="login-input" value={customExp} onChange={e => setCustomExp(Number(e.target.value))} min="0" required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Education</label>
                    <input type="text" className="login-input" value={customEdu} onChange={e => setCustomEdu(e.target.value)} placeholder="e.g. B.S. CS" />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Commit Days</label>
                    <input type="number" className="login-input" value={customCommitDays} onChange={e => setCustomCommitDays(e.target.value)} placeholder="Auto" min="0" max="31" />
                  </div>
                </div>

                <h4 style={{ color: '#a78bfa', marginBottom: '10px', fontSize: '0.95rem' }}>Cohort Missions Checklist (Days 1–31)</h4>
                <div style={{
                  maxHeight: '240px',
                  overflowY: 'auto',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  padding: '12px',
                  background: 'rgba(0,0,0,0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginBottom: '20px'
                }}>
                  {(curriculumDays.length > 0 ? curriculumDays : Array.from({ length: 31 }, (_, i) => ({ day: i + 1, topics: [`Module Day ${i + 1}`] }))).map(d => {
                    const sel = missionSelections[d.day] || { status: 'passed', attempts: 1 };
                    return (
                      <div key={d.day} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', padding: '4px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                        <span style={{ color: '#e2e8f0', flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          <strong>Day {d.day}:</strong> {d.topics?.[0] || d.title || `Day ${d.day}`}
                        </span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <select 
                            value={sel.status} 
                            onChange={e => setMissionSelections(prev => ({ ...prev, [d.day]: { ...sel, status: e.target.value } }))}
                            style={{ background: '#0a0d14', color: sel.status === 'passed' ? '#34d399' : sel.status === 'skipped' ? '#fbbf24' : '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '2px 6px', fontSize: '0.75rem' }}
                          >
                            <option value="passed">Passed</option>
                            <option value="skipped">Skipped</option>
                          </select>
                          {sel.status === 'passed' && (
                            <select 
                              value={sel.attempts} 
                              onChange={e => setMissionSelections(prev => ({ ...prev, [d.day]: { ...sel, attempts: Number(e.target.value) } }))}
                              style={{ background: '#0a0d14', color: '#a78bfa', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '2px 6px', fontSize: '0.75rem' }}
                            >
                              <option value="1">1 Try</option>
                              <option value="2">2 Tries</option>
                              <option value="3">3 Tries</option>
                              <option value="4">4 Tries</option>
                              <option value="5">5 Tries</option>
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button type="submit" disabled={submittingCustom} className="login-btn">
                  {submittingCustom ? 'Creating Candidate...' : 'Save & Start Interview'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function InterviewHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('interviewHistory') || '[]');
    const currentUser = localStorage.getItem('interviewer_name') || '';
    
    fetch(`${API_BASE}/api/interviews?interviewer=${encodeURIComponent(currentUser)}`)
      .then(res => res.json())
      .then(serverHistory => {
        const mergedMap = new Map();
        saved.forEach(item => mergedMap.set(item.id, item));
        serverHistory.forEach(item => mergedMap.set(item.id, item));
        const mergedList = Array.from(mergedMap.values()).filter(h => !currentUser || h.interviewerName === currentUser);
        setHistory(mergedList.reverse());
      })
      .catch(() => {
        const myHistory = saved.filter(h => !currentUser || h.interviewerName === currentUser);
        setHistory(myHistory.reverse());
      });
  }, []);

  return (
    <div className="dashboard-container">
      <Sidebar activePage="interviews" />

      <main className="dashboard-main">
        <div className="dashboard-header">
          <div className="dashboard-title">
            <h1>Interview History</h1>
            <p>A log of completed interview sessions recorded in the system.</p>
          </div>
        </div>

        <div className="candidate-grid">
          {history.length > 0 ? (
            history.map((h, i) => (
              <div key={h.id || i} className="candidate-grid-card" style={{ cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === h.id ? null : h.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="candidate-info">
                    <div className="candidate-name">{h.candidateName}</div>
                    <div className="candidate-role">{h.role}</div>
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    textTransform: 'capitalize',
                    background: h.interviewerType === 'deep_dive' ? 'rgba(239, 68, 68, 0.15)' : h.interviewerType === 'friendly' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                    color: h.interviewerType === 'deep_dive' ? '#f87171' : h.interviewerType === 'friendly' ? '#34d399' : '#c084fc',
                    border: `1px solid ${h.interviewerType === 'deep_dive' ? 'rgba(239,68,68,0.3)' : h.interviewerType === 'friendly' ? 'rgba(52,211,153,0.3)' : 'rgba(139,92,246,0.3)'}`
                  }}>
                    {h.interviewerType ? h.interviewerType.replace('_', ' ') : 'Standard'}
                  </span>
                </div>

                <div className="candidate-stats" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(h.timestamp).toLocaleString()}</span>
                  {h.status === 'ended_early' ? (
                    <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                      Ended Early ({h.questionsAnswered || 1}/8)
                    </span>
                  ) : (
                    <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                      Completed ({h.questionsAnswered || 8}/8)
                    </span>
                  )}
                </div>

                {expandedId === h.id && h.feedback && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.85rem', color: '#cbd5e1' }}>
                    <p style={{ margin: '0 0 8px 0' }}><strong>Summary:</strong> {h.feedback.summary}</p>
                    {h.feedback.score !== undefined && (
                      <div style={{ color: '#a78bfa', fontWeight: 'bold' }}>Final Score: {h.feedback.score}/100</div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="no-candidates">No interviews yet. Complete an interview to view logs here.</div>
          )}
        </div>
      </main>
    </div>
  );
}

function Interview() {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedCandidate = location.state?.candidate;
  const persona = location.state?.persona || 'default';
  
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [ragActivity, setRagActivity] = useState([]);
  const [questionCount, setQuestionCount] = useState(1);
  const [ending, setEnding] = useState(false);
  const messagesEndRef = useRef(null);
  
  const [activeSpeaker, setActiveSpeaker] = useState('Socrates');
  const [analytics, setAnalytics] = useState({ confidenceScore: null, sentiment: null, technicalDensity: null });
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [pendingFeedback, setPendingFeedback] = useState(null);

  const initialized = useRef(false);
  const inflight = useRef(false); // race-condition guard

  useEffect(() => {
    if (!selectedCandidate) {
      navigate('/candidates');
      return;
    }
    
    if (initialized.current) return;
    initialized.current = true;

    const startInterview = async () => {
      const newSessionId = crypto.randomUUID();
      setSessionId(newSessionId);
      setLoading(true);

      const savedHistory = JSON.parse(localStorage.getItem('interviewHistory') || '[]');
      savedHistory.push({
        id: newSessionId,
        candidateName: selectedCandidate.member.name,
        role: selectedCandidate.jobRole,
        interviewerName: localStorage.getItem('interviewer_name') || 'Unknown',
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('interviewHistory', JSON.stringify(savedHistory));

      try {
        const res = await fetch(`${API_BASE}/api/interview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: newSessionId, candidate: selectedCandidate, persona })
        });
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const data = await res.json();
        if (data.error) {
          setMessages([{ role: 'assistant', content: `⚠️ Server Error: ${data.error}. Please refresh and try again.`, speaker: 'Socrates' }]);
        } else {
          setMessages([{ role: 'assistant', content: data.reply, speaker: data.speaker || 'Socrates', id: crypto.randomUUID() }]);
          if (data.speaker) setActiveSpeaker(data.speaker);
          if (data.ragSources) setRagActivity(data.ragSources);
        }
      } catch (err) {
        console.error(err);
        setMessages([{ role: 'assistant', content: '⚠️ Connection failed. Please check your network and refresh the page.', speaker: 'Socrates', id: crypto.randomUUID() }]);
      } finally {
        setLoading(false);
      }
    };

    startInterview();
  }, [selectedCandidate, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading || feedback || inflight.current) return;
    inflight.current = true;
    
    const userMsg = input.trim();
    const msgId = crypto.randomUUID();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg, id: msgId }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: userMsg })
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      
      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${data.error}`, speaker: 'Socrates', id: crypto.randomUUID() }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply, speaker: data.speaker || 'Socrates', id: crypto.randomUUID() }]);
        if (data.speaker) setActiveSpeaker(data.speaker);
        if (data.analytics) setAnalytics(data.analytics);
        // Use server's questionCount as source of truth
        if (data.questionCount !== undefined) setQuestionCount(data.questionCount + 1);
        
        if (data.done && data.feedback) {
          setPendingFeedback(data.feedback);
          setShowCompletionModal(true);
          
          const savedHistory = JSON.parse(localStorage.getItem('interviewHistory') || '[]');
          const updatedHistory = savedHistory.map(h => 
            h.id === sessionId ? { ...h, feedback: data.feedback } : h
          );
          localStorage.setItem('interviewHistory', JSON.stringify(updatedHistory));
        }
        if (data.ragSources) setRagActivity(data.ragSources);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Connection error — your response was not sent. Please try again.', speaker: 'Socrates', id: crypto.randomUUID() }]);
    } finally {
      setLoading(false);
      inflight.current = false;
    }
  };

  if (!selectedCandidate) return null;

  return (
    <div className="fullscreen-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <header className="chat-header glass-card" style={{ margin: '20px 10% 10px', borderRadius: '16px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ color: 'white', margin: '0 0 4px 0', fontSize: '1.2rem' }}>Interviewing {selectedCandidate.member.name}</h2>
          <div className="role-badge" style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{selectedCandidate.member.jobRole}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1, justifyContent: 'center' }}>
          <div className="question-tracker" style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Question {Math.min(questionCount, 8)}/8</div>
          
          <div className="panel-speakers" style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '4px 10px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
            {[
              { name: 'Socrates', role: 'Systems', icon: '🏛️', color: '#a78bfa' },
              { name: 'Grace Hopper', role: 'Backend', icon: '💻', color: '#2dd4bf' },
              { name: 'Sun Tzu', role: 'Strategy', icon: '🛡️', color: '#f43f5e' }
            ].map(agent => {
              const isActive = activeSpeaker === agent.name;
              return (
                <div key={agent.name} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: isActive ? 1 : 0.4,
                  transform: isActive ? 'scale(1.03)' : 'scale(0.97)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  padding: '3px 8px',
                  borderRadius: '16px',
                  background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                  boxShadow: isActive ? `0 0 10px ${agent.color}25` : 'none'
                }}>
                  <span style={{ fontSize: '0.9rem' }}>{agent.icon}</span>
                  <span style={{ fontSize: '0.75rem', color: isActive ? 'white' : '#94a3b8', fontWeight: isActive ? 'bold' : 'normal' }}>{agent.name}</span>
                  {isActive && <span className="live-dot" style={{ background: agent.color, width: '5px', height: '5px', margin: 0 }} />}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, justifyContent: 'flex-end' }}>
          {ragActivity.length > 0 && (
            <div className="rag-indicator" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '8px' }}>
              <span className="rag-pulse"></span>
              <span style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 'bold' }}>RAG</span>
            </div>
          )}
          <button 
            onClick={async () => {
              if (ending) return;
              setEnding(true);
              try {
                const res = await fetch(`${API_BASE}/api/interview/end`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    sessionId,
                    interviewerName: localStorage.getItem('interviewer_name') || 'Unknown',
                    candidateName: selectedCandidate.member.name,
                    role: selectedCandidate.jobRole,
                    status: questionCount >= 8 ? 'completed' : 'ended_early'
                  })
                });
                const data = await res.json();
                if (data.record && data.record.feedback) {
                  setFeedback(data.record.feedback);
                  const savedHistory = JSON.parse(localStorage.getItem('interviewHistory') || '[]');
                  const updatedHistory = savedHistory.map(h => 
                    h.id === sessionId ? { ...h, status: data.record.status, questionsAnswered: data.record.questionsAnswered, feedback: data.record.feedback } : h
                  );
                  localStorage.setItem('interviewHistory', JSON.stringify(updatedHistory));
                } else {
                  navigate('/overview');
                }
              } catch (err) {
                console.error(err);
                navigate('/overview');
              } finally {
                setEnding(false);
              }
            }} 
            disabled={ending}
            className="end-btn" 
            style={{ color: 'white', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', cursor: ending ? 'wait' : 'pointer', fontSize: '0.8rem', padding: '6px 14px' }}
          >
            {ending ? 'Evaluating...' : 'End Session'}
          </button>
        </div>
      </header>

      {/* Two column grid layout for Sidebar Analytics + Chat Window */}
      <div className="interview-layout" style={{
        display: 'flex',
        gap: '20px',
        margin: '10px 10% 20px',
        flex: 1,
        minHeight: 0, // critical for nested flex overflows
        alignItems: 'stretch'
      }}>
        {/* Left Column: Cognitive Analytics Widget */}
        {!feedback && (
          <div className="analytics-panel glass-card" style={{
            width: '240px',
            padding: '20px',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            flexShrink: 0,
            background: 'rgba(7,9,14,0.65)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(12px)',
            justifyContent: 'flex-start'
          }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#a78bfa', letterSpacing: '0.5px', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>Cognitive Profile</h3>
            
            {analytics.confidenceScore !== null ? (
              <>
                {/* Confidence ring */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Answer Confidence</span>
                  <div style={{
                    position: 'relative',
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: `conic-gradient(#a78bfa ${analytics.confidenceScore}%, rgba(255,255,255,0.05) ${analytics.confidenceScore}%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 12px rgba(167, 139, 250, 0.15)'
                  }}>
                    <div style={{
                      width: '68px',
                      height: '68px',
                      borderRadius: '50%',
                      backgroundColor: '#07090e',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white' }}>{analytics.confidenceScore}%</span>
                    </div>
                  </div>
                </div>

                {/* Cognitive Mood badge */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cognitive Mood</span>
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    color: analytics.sentiment === 'Confident' ? '#2dd4bf' : analytics.sentiment === 'Analytical' ? '#a78bfa' : analytics.sentiment === 'Hesitant' ? '#fbbf24' : '#f87171',
                    background: analytics.sentiment === 'Confident' ? 'rgba(45, 212, 191, 0.08)' : analytics.sentiment === 'Analytical' ? 'rgba(167, 139, 250, 0.08)' : analytics.sentiment === 'Hesitant' ? 'rgba(251, 191, 36, 0.08)' : 'rgba(248, 113, 113, 0.08)',
                    border: `1px solid ${analytics.sentiment === 'Confident' ? 'rgba(45, 212, 191, 0.2)' : analytics.sentiment === 'Analytical' ? 'rgba(167, 139, 250, 0.2)' : analytics.sentiment === 'Hesitant' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(248, 113, 113, 0.2)'}`
                  }}>
                    {analytics.sentiment}
                  </div>
                </div>

                {/* Jargon density */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Technical Jargon</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    {[1, 2, 3].map(level => {
                      const active = (analytics.technicalDensity === 'High') || (analytics.technicalDensity === 'Medium' && level <= 2) || (analytics.technicalDensity === 'Low' && level === 1);
                      return (
                        <div key={level} style={{
                          flex: 1,
                          height: '6px',
                          borderRadius: '3px',
                          background: active ? '#a78bfa' : 'rgba(255,255,255,0.05)',
                          boxShadow: active ? '0 0 6px rgba(167, 139, 250, 0.3)' : 'none',
                          transition: 'all 0.3s ease'
                        }} />
                      );
                    })}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', textAlign: 'right', marginTop: '2px' }}>{analytics.technicalDensity} Jargon usage</span>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '10px', opacity: 0.5, padding: '20px 0' }}>
                <span style={{ fontSize: '1.5rem' }}>📊</span>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', margin: 0, lineHeight: '1.4' }}>Awaiting candidate answer to analyze response metrics...</p>
              </div>
            )}
          </div>
        )}

        {/* Right Column: Chat Window and Input area */}
        <div className="chat-window-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
          <div className="chat-window" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', margin: 0, width: '100%', overflow: 'hidden' }}>
            <div className="messages-area" style={{ flex: 1, overflowY: 'auto' }}>
              {messages.map((m, i) => (
                <div key={m.id || i} className={`message-wrapper ${m.role}`}>
                  {m.role === 'assistant' && m.speaker && (
                    <div className="speaker-pill" style={{
                      fontSize: '0.7rem',
                      color: m.speaker === 'Socrates' ? '#a78bfa' : m.speaker === 'Grace Hopper' ? '#2dd4bf' : '#f43f5e',
                      background: m.speaker === 'Socrates' ? 'rgba(139, 92, 246, 0.12)' : m.speaker === 'Grace Hopper' ? 'rgba(45, 212, 191, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      border: m.speaker === 'Socrates' ? '1px solid rgba(139, 92, 246, 0.25)' : m.speaker === 'Grace Hopper' ? '1px solid rgba(45, 212, 191, 0.25)' : '1px solid rgba(244, 63, 94, 0.25)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginBottom: '6px',
                      fontWeight: '600'
                    }}>
                      {m.speaker === 'Socrates' ? '🏛️ Socrates' : m.speaker === 'Grace Hopper' ? '💻 Grace Hopper' : '🛡️ Sun Tzu'}
                    </div>
                  )}
                  <div className="message">
                    {m.role === 'assistant' ? <FormattedMessage text={m.content} /> : m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="message-wrapper assistant">
                  <div className="message ai-thinking">
                    AI is thinking 
                    <span className="loading-dots"><span>.</span><span>.</span><span>.</span></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {feedback ? (
              <div className="feedback-card" style={{ overflowY: 'auto', maxHeight: '400px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, color: '#a78bfa' }}>📋 Interview Report</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {feedback.score !== undefined && (
                      <div className="score-badge" style={{
                        background: feedback.score >= 75 ? 'rgba(16,185,129,0.15)' : feedback.score >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                        padding: '6px 14px', borderRadius: '20px',
                        color: feedback.score >= 75 ? '#34d399' : feedback.score >= 50 ? '#fbbf24' : '#f87171',
                        fontWeight: 'bold',
                        border: `1px solid ${feedback.score >= 75 ? 'rgba(16,185,129,0.4)' : feedback.score >= 50 ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)'}`,
                        fontSize: '0.85rem'
                      }}>Score: {feedback.score}/100</div>
                    )}
                    <button
                      title="Close report & return to interview chat"
                      onClick={() => setFeedback(null)}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '8px',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        padding: '4px 10px',
                        lineHeight: '1.4',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.12)'; e.currentTarget.style.color='white'; }}
                      onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.color='#94a3b8'; }}
                    >✕ Back to Chat</button>
                  </div>
                </div>
                <p className="summary"><strong>Summary:</strong> {feedback.summary}</p>
                <div className="feedback-grid">
                  <div className="feedback-section">
                    <h4>Strengths</h4>
                    <ul>{feedback.strengths.map((s,i) => <li key={i}>{s}</li>)}</ul>
                  </div>
                  <div className="feedback-section">
                    <h4>Gaps</h4>
                    <ul>{feedback.gaps.map((g,i) => <li key={i}>{g}</li>)}</ul>
                  </div>
                </div>
                <div className="feedback-section next-steps">
                  <h4>Next Steps</h4>
                  <ul>{feedback.next.map((n,i) => <li key={i}>{n}</li>)}</ul>
                </div>
                {feedback.revisionDeck && feedback.revisionDeck.length > 0 && (
                  <div className="feedback-section revision-deck" style={{ marginTop: '24px' }}>
                    <h4 style={{ color: '#a78bfa', marginBottom: '16px' }}>Revision Deck</h4>
                    <div className="flashcard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                      {feedback.revisionDeck.map((card, i) => (
                        <div key={i} className="flashcard glass-card" style={{ padding: '12px', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                          <div className="flashcard-topic" style={{ fontWeight: 'bold', color: 'white', marginBottom: '6px', fontSize: '0.85rem', textTransform: 'uppercase' }}>{card.topic}</div>
                          <div className="flashcard-concept" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.4' }}>{card.concept}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <button 
                  onClick={() => navigate('/overview')}
                  className="primary-btn"
                  style={{
                    marginTop: '28px',
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                  }}
                >
                  Return to Dashboard
                </button>
              </div>
            ) : (
              <div className="input-area">
                <textarea 
                  value={input} 
                  onChange={e => {
                    setInput(e.target.value);
                    playTypingSound();
                    // Auto-resize
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      sendMessage(e);
                    }
                  }}
                  placeholder="Type your response... (Ctrl+Enter to send)" 
                  disabled={loading}
                  rows={1}
                  style={{ height: '60px' }}
                />
                <button onClick={sendMessage} className="send-btn" disabled={loading || !input.trim()}>Send</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Completion Modal Popup */}
      {showCompletionModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(8px)'
        }}>
          <div className="glass-card" style={{
            width: '440px',
            padding: '32px',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            textAlign: 'center',
            background: 'rgba(10,13,20,0.95)'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🏆</div>
            <h3 style={{ color: 'white', marginTop: 0, marginBottom: '8px', fontSize: '1.25rem' }}>Technical Interview Completed!</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '24px' }}>
              The 3-Agent Panel evaluation has completed. A diagnostic report for <strong>{selectedCandidate.member.name}</strong> is ready.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={() => {
                  setFeedback(pendingFeedback);
                  setShowCompletionModal(false);
                }}
                className="primary-btn"
                style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 'bold' }}
              >
                View Detailed Evaluation Report
              </button>
              <button 
                onClick={() => navigate('/overview')}
                className="sec-btn"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '0.95rem',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#94a3b8',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportsDashboard() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('interviewHistory') || '[]');
    const currentUser = localStorage.getItem('interviewer_name') || '';

    fetch(`${API_BASE}/api/interviews?interviewer=${encodeURIComponent(currentUser)}`)
      .then(res => res.json())
      .then(serverHistory => {
        const mergedMap = new Map();
        saved.filter(h => h.feedback).forEach(item => mergedMap.set(item.id, item));
        serverHistory.filter(h => h.feedback).forEach(item => mergedMap.set(item.id, item));
        const mergedList = Array.from(mergedMap.values()).filter(h => !currentUser || h.interviewerName === currentUser);
        setHistory(mergedList.reverse());
      })
      .catch(() => {
        const myHistory = saved.filter(h => (!currentUser || h.interviewerName === currentUser) && h.feedback);
        setHistory(myHistory.reverse());
      });
  }, []);

  return (
    <div className="dashboard-container">
      <Sidebar activePage="reports" />

      <main className="dashboard-main">
        <div className="dashboard-header">
          <div className="dashboard-title">
            <h1>Evaluation Reports</h1>
            <p>Detailed scores and revision decks for completed interviews.</p>
          </div>
        </div>

        <div className="reports-list" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {history.length > 0 ? (
            history.map((h, i) => (
              <RevealOnScroll key={h.id || i} delay={(i % 10) * 0.1}>
                <div className="report-card glass-card" style={{ padding: '24px', cursor: 'pointer', transition: 'all 0.3s ease' }} onClick={() => setExpandedId(expandedId === h.id ? null : h.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                        <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem' }}>{h.candidateName} <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'normal' }}>({h.role})</span></h3>
                        {h.status === 'ended_early' ? (
                          <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                            Ended Early ({h.questionsAnswered || 1}/8)
                          </span>
                        ) : (
                          <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                            Completed
                          </span>
                        )}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{new Date(h.timestamp).toLocaleString()}</div>
                    </div>
                    {h.feedback.score !== undefined && (
                      <div style={{ background: 'rgba(139, 92, 246, 0.2)', padding: '12px 24px', borderRadius: '12px', color: '#a78bfa', fontWeight: 'bold', border: '1px solid rgba(139, 92, 246, 0.5)', fontSize: '1.2rem' }}>
                        {h.feedback.score}/100
                      </div>
                    )}
                  </div>
                  
                  {expandedId === h.id && (
                    <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <p style={{ color: 'white', marginBottom: '24px', lineHeight: '1.6' }}><strong>Summary:</strong> {h.feedback.summary}</p>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                        <div>
                          <h4 style={{ color: '#10b981', marginBottom: '12px' }}>Strengths</h4>
                          <ul style={{ color: 'var(--text-secondary)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {h.feedback.strengths.map((s, idx) => <li key={idx}>{s}</li>)}
                          </ul>
                        </div>
                        <div>
                          <h4 style={{ color: '#ef4444', marginBottom: '12px' }}>Gaps</h4>
                          <ul style={{ color: 'var(--text-secondary)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {h.feedback.gaps.map((g, idx) => <li key={idx}>{g}</li>)}
                          </ul>
                        </div>
                      </div>

                      {h.feedback.revisionDeck && h.feedback.revisionDeck.length > 0 && (
                        <div>
                          <h4 style={{ color: '#a78bfa', marginBottom: '16px' }}>Revision Deck</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                            {h.feedback.revisionDeck.map((card, idx) => (
                              <div key={idx} style={{ background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                                <div style={{ fontWeight: 'bold', color: 'white', marginBottom: '8px', fontSize: '0.9rem', textTransform: 'uppercase' }}>{card.topic}</div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>{card.concept}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </RevealOnScroll>
            ))
          ) : (
            <div className="no-candidates">No reports available yet. Complete an interview to generate one.</div>
          )}
        </div>
      </main>
    </div>
  );
}

function OverviewDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/stats`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error);
  }, []);

  return (
    <div className="dashboard-container">
      <Sidebar activePage="overview" />

      <main className="dashboard-main">
        <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '36px' }}>
          <div className="dashboard-title">
            <h1 style={{ fontSize: '1.85rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>AI Cohort Technical Interview Agent</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: '650px', lineHeight: '1.5' }}>
              Conducts personalized, adaptive multi-turn technical interviews based on a candidate's actual cohort progress, powered by real-time RAG context retrieval and cognitive analytics.
            </p>
          </div>
          <button 
            style={{ 
              padding: '12px 26px', 
              fontSize: '0.95rem', 
              fontWeight: 'bold', 
              background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '10px', 
              cursor: 'pointer', 
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
              whiteSpace: 'nowrap' 
            }} 
            onClick={() => navigate('/candidates')}
          >
            Select Candidate to Interview &rarr;
          </button>
        </div>

        {/* Stats Grid */}
        <div className="stats-overview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <RevealOnScroll delay={0.1}>
            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.08em', fontWeight: 600 }}>Candidate Roster</div>
              <div style={{ fontSize: '2.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>{stats?.candidates || 15}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.12)', color: '#34d399', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }}></span>
                Active Members
              </div>
            </div>
          </RevealOnScroll>
          <RevealOnScroll delay={0.2}>
            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.08em', fontWeight: 600 }}>Curriculum Scope</div>
              <div style={{ fontSize: '2.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>{stats?.days || 31} <span style={{ fontSize: '1.25rem', color: '#94a3b8', fontWeight: 500 }}>Days</span></div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(168, 85, 247, 0.12)', color: '#c084fc', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>
                8 Modules
              </div>
            </div>
          </RevealOnScroll>
          <RevealOnScroll delay={0.3}>
            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.08em', fontWeight: 600 }}>Questions Budget</div>
              <div style={{ fontSize: '2.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>8 Questions</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>
                4+ Days Minimum Coverage
              </div>
            </div>
          </RevealOnScroll>
        </div>

        {/* Quick Hub Navigation Cards */}
        <h2 style={{ color: '#f8fafc', marginBottom: '20px', fontSize: '1.25rem', fontWeight: 700 }}>Quick Navigation Hub</h2>
        <div className="hub-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '40px' }}>
          <RevealOnScroll delay={0.1}>
            <div className="glass-card" style={{ padding: '28px', cursor: 'pointer' }} onClick={() => navigate('/candidates')}>
              <h3 style={{ color: '#f8fafc', marginTop: 0, marginBottom: '8px', fontSize: '1.15rem' }}>Candidates</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '20px' }}>View candidate profiles, completion signals, YOE, and launch customized technical interviews.</p>
              <span style={{ color: '#c084fc', fontWeight: 600, fontSize: '0.85rem' }}>Open Candidates &rarr;</span>
            </div>
          </RevealOnScroll>
          <RevealOnScroll delay={0.2}>
            <div className="glass-card" style={{ padding: '28px', cursor: 'pointer' }} onClick={() => navigate('/interviews')}>
              <h3 style={{ color: '#f8fafc', marginTop: 0, marginBottom: '8px', fontSize: '1.15rem' }}>Interview History</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '20px' }}>Review past interview logs, timestamps, and candidate roles filtered by interviewer.</p>
              <span style={{ color: '#c084fc', fontWeight: 600, fontSize: '0.85rem' }}>View History &rarr;</span>
            </div>
          </RevealOnScroll>
          <RevealOnScroll delay={0.3}>
            <div className="glass-card" style={{ padding: '28px', cursor: 'pointer' }} onClick={() => navigate('/reports')}>
              <h3 style={{ color: '#f8fafc', marginTop: 0, marginBottom: '8px', fontSize: '1.15rem' }}>Evaluation Reports</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '20px' }}>Access AI-generated candidate scores, strengths/weaknesses, and revision decks.</p>
              <span style={{ color: '#c084fc', fontWeight: 600, fontSize: '0.85rem' }}>Explore Reports &rarr;</span>
            </div>
          </RevealOnScroll>
        </div>
      </main>
    </div>
  );
}

function BackgroundWrapper({ children }) {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isCandidates = location.pathname === '/candidates';
  const isInterview = location.pathname === '/interview';
  const isInterviews = location.pathname === '/interviews';
  const isReports = location.pathname === '/reports';
  const isOverview = location.pathname === '/overview';
  
  return (
    <>
      {isHome && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -2, background: '#050510' }}>
          <DopaCore theme="colorful" count={12000} autoSpin={true} speedMult={1} />
        </div>
      )}
      {(isCandidates || isInterviews || isReports || isOverview) && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -2, background: '#07090e' }}>
          <Antigravity
            count={90}
            magnetRadius={5}
            ringRadius={5}
            waveSpeed={0.12}
            waveAmplitude={0.7}
            particleSize={1.0}
            lerpSpeed={0.03}
            color={'#475569'}
            autoAnimate={true}
            particleVariance={0.6}
          />
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'radial-gradient(ellipse at 50% 15%, rgba(30, 27, 75, 0.2) 0%, rgba(7, 9, 14, 0.9) 100%)', pointerEvents: 'none' }}></div>
        </div>
      )}
      {isInterview && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -2 }}>
          <LampLight theme="monochrome" count={15000} />
          {/* Enhanced dark overlay to ensure high text legibility over beam */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(7, 9, 14, 0.75)', pointerEvents: 'none' }}></div>
        </div>
      )}
      {children}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <BackgroundWrapper>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/overview" element={<OverviewDashboard />} />
          <Route path="/candidates" element={<CandidateSelection />} />
          <Route path="/interviews" element={<InterviewHistory />} />
          <Route path="/reports" element={<ReportsDashboard />} />
          <Route path="/interview" element={<Interview />} />
        </Routes>
      </BackgroundWrapper>
    </BrowserRouter>
  );
}

export default App;
