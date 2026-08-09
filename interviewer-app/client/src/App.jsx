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
  const [persona, setPersona] = useState('default');
  
  // Custom Candidate State
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [customExp, setCustomExp] = useState(0);
  const [customDay, setCustomDay] = useState(15);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_BASE}/api/candidates`)
      .then(res => res.json())
      .then(data => setCandidates(data))
      .catch(err => console.error("Error fetching candidates", err));
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

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    
    // Generate fake missions up to the chosen day
    const generatedMissions = [];
    for (let i = 1; i <= customDay; i++) {
      generatedMissions.push({
        day: i,
        title: `Cohort Module ${i}`,
        passed: true,
        attempts: 1
      });
    }

    const customCandidate = {
      member: {
        id: `custom_${Date.now()}`,
        name: customName,
        jobRole: customRole,
        yearsExperience: customExp,
        education: "Custom Input",
        status: "active"
      },
      missions: generatedMissions,
      signals: {
        commitDays: Math.floor(customDay * 0.8),
        missionsCompleted: customDay,
        missionsFirstTry: Math.floor(customDay * 0.9)
      }
    };

    setShowCustomModal(false);
    navigate('/interview', { state: { candidate: customCandidate, persona } });
  };

  return (
    <div className="dashboard-container">
      <aside className="dashboard-sidebar">
        <div className="sidebar-logo">AI Cohort Agent</div>
        <nav className="sidebar-nav">
          <div className="nav-item" onClick={() => navigate('/overview')}>
            <span>Overview</span>
          </div>
          <div className="nav-item active">
            <span>Candidates</span>
          </div>
          <div className="nav-item" onClick={() => navigate('/interviews')}>
            <span>Interviews</span>
          </div>
          <div className="nav-item" onClick={() => navigate('/reports')}>
            <span>Reports</span>
          </div>
        </nav>
      </aside>

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
              value={persona} 
              onChange={e => setPersona(e.target.value)}
              className="sort-select persona-select"
              style={{ borderColor: 'var(--accent)' }}
            >
              <option value="default">Standard Interviewer</option>
              <option value="socrates">Socrates (Philosophical)</option>
              <option value="nietzsche">Friedrich Nietzsche (Intense)</option>
              <option value="sun-tzu">Sun Tzu (Strategic)</option>
              <option value="hopper">Grace Hopper (Pragmatic)</option>
            </select>
          </div>
        </div>

        <div className="candidate-grid">
          {filteredAndSorted.length > 0 ? (
            filteredAndSorted.map((c, index) => (
              <RevealOnScroll key={c.member.id} delay={(index % 10) * 0.1}>
                <div 
                  onClick={() => navigate('/interview', { state: { candidate: c, persona } })} 
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
                  <div className="candidate-stats">
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span className="experience-pill">{c.member.yearsExperience} YOE</span>
                      <span className="experience-pill">{c.signals?.missionsCompleted || 0}/31 Missions</span>
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
            <div className="modal-content" style={{ maxWidth: '500px' }}>
              <button className="close-btn" onClick={() => setShowCustomModal(false)}>&times;</button>
              <form onSubmit={handleCustomSubmit} className="login-form" style={{ width: '100%', maxWidth: '100%' }}>
                <h2 style={{ marginBottom: '24px', marginTop: 0, color: 'var(--text-primary)' }}>Custom Candidate</h2>
                
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Name</label>
                  <input type="text" className="login-input" value={customName} onChange={e => { setCustomName(e.target.value); playTypingSound(); }} required />
                </div>
                
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Domain / Job Role</label>
                  <input type="text" className="login-input" value={customRole} onChange={e => { setCustomRole(e.target.value); playTypingSound(); }} placeholder="e.g. Frontend Developer" required />
                </div>
                
                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Years of Exp.</label>
                    <input type="number" className="login-input" value={customExp} onChange={e => setCustomExp(Number(e.target.value))} min="0" required />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Cohort Day (1-31)</label>
                    <input type="number" className="login-input" value={customDay} onChange={e => setCustomDay(Number(e.target.value))} min="1" max="31" required />
                  </div>
                </div>

                <button type="submit" className="login-btn">Start Custom Interview</button>
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

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('interviewHistory') || '[]');
    const currentUser = localStorage.getItem('interviewer_name');
    const myHistory = saved.filter(h => h.interviewerName === currentUser);
    setHistory(myHistory.reverse());
  }, []);

  return (
    <div className="dashboard-container">
      <aside className="dashboard-sidebar">
        <div className="sidebar-logo">AI Cohort Agent</div>
        <nav className="sidebar-nav">
          <div className="nav-item" onClick={() => navigate('/overview')}>
            <span>Overview</span>
          </div>
          <div className="nav-item" onClick={() => navigate('/candidates')}>
            <span>Candidates</span>
          </div>
          <div className="nav-item active">
            <span>Interviews</span>
          </div>
          <div className="nav-item" onClick={() => navigate('/reports')}>
            <span>Reports</span>
          </div>
        </nav>
      </aside>

      <main className="dashboard-main">
        <div className="dashboard-header">
          <div className="dashboard-title">
            <h1>Interview History</h1>
            <p>A log of candidates you have previously interviewed.</p>
          </div>
        </div>

        <div className="candidate-grid">
          {history.length > 0 ? (
            history.map((h, i) => (
              <div key={i} className="candidate-grid-card" style={{ cursor: 'default' }}>
                <div className="candidate-info">
                  <div className="candidate-name">{h.candidateName}</div>
                  <div className="candidate-role">{h.role}</div>
                </div>
                <div className="candidate-stats">
                  <span>{new Date(h.timestamp).toLocaleString()}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="no-candidates">No interviews have been recorded yet.</div>
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
  const messagesEndRef = useRef(null);
  
  const initialized = useRef(false);

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
        const data = await res.json();
        if (data.error) {
          setMessages([{ role: 'assistant', content: `Server Error: ${data.error}` }]);
        } else {
          setMessages([{ role: 'assistant', content: data.reply }]);
          if (data.ragSources) setRagActivity(data.ragSources);
        }
      } catch (err) {
        console.error(err);
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
    if (!input.trim() || loading || feedback) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: userMsg })
      });
      const data = await res.json();
      
      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Server Error: ${data.error}` }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        setQuestionCount(prev => prev + 1);
        if (data.ragSources) setRagActivity(data.ragSources);
        if (data.done && data.feedback) {
          setFeedback(data.feedback);
          const savedHistory = JSON.parse(localStorage.getItem('interviewHistory') || '[]');
          const updatedHistory = savedHistory.map(h => 
            h.id === sessionId ? { ...h, feedback: data.feedback } : h
          );
          localStorage.setItem('interviewHistory', JSON.stringify(updatedHistory));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedCandidate) return null;

  return (
    <div className="fullscreen-container">
      <header className="chat-header glass-card" style={{ margin: '20px 10%', borderRadius: '16px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ color: 'white' }}>Interviewing {selectedCandidate.member.name}</h2>
          <div className="role-badge" style={{ color: '#94a3b8' }}>{selectedCandidate.member.jobRole}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1, justifyContent: 'center' }}>
          <div className="question-tracker">Question {Math.min(questionCount, 8)} / 8</div>
          <div className="live-indicator">
            <span className="live-dot"></span> LIVE INTERVIEW
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, justifyContent: 'flex-end' }}>
          {ragActivity.length > 0 && (
            <div className="rag-indicator">
              <span className="rag-pulse"></span>
              <span style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 'bold' }}>RAG</span>
            </div>
          )}
          <button onClick={() => navigate('/')} className="end-btn" style={{ color: 'white', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)' }}>End Session</button>
        </div>
      </header>
      
      <div className="chat-window">
        <div className="messages-area">
          {messages.map((m, i) => (
            <div key={i} className={`message-wrapper ${m.role}`}>
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
          <div className="feedback-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Interview Completed</h3>
              {feedback.score !== undefined && (
                <div className="score-badge" style={{ background: 'rgba(139, 92, 246, 0.2)', padding: '8px 16px', borderRadius: '20px', color: '#a78bfa', fontWeight: 'bold', border: '1px solid rgba(139, 92, 246, 0.5)' }}>Score: {feedback.score}/100</div>
              )}
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
                <div className="flashcard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  {feedback.revisionDeck.map((card, i) => (
                    <div key={i} className="flashcard glass-card" style={{ padding: '16px', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                      <div className="flashcard-topic" style={{ fontWeight: 'bold', color: 'white', marginBottom: '8px', fontSize: '0.9rem', textTransform: 'uppercase' }}>{card.topic}</div>
                      <div className="flashcard-concept" style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{card.concept}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="input-area">
            <textarea 
              value={input} 
              onChange={e => {
                setInput(e.target.value);
                playTypingSound();
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  sendMessage(e);
                }
              }}
              placeholder="Type your response... (Cmd/Ctrl + Enter to send)" 
              disabled={loading}
              rows={1}
            />
            <button onClick={sendMessage} className="send-btn" disabled={loading || !input.trim()}>Send</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportsDashboard() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('interviewHistory') || '[]');
    const currentUser = localStorage.getItem('interviewer_name');
    const myHistory = saved.filter(h => h.interviewerName === currentUser && h.feedback);
    setHistory(myHistory.reverse());
  }, []);

  return (
    <div className="dashboard-container">
      <aside className="dashboard-sidebar">
        <div className="sidebar-logo">AI Cohort Agent</div>
        <nav className="sidebar-nav">
          <div className="nav-item" onClick={() => navigate('/overview')}>
            <span>Overview</span>
          </div>
          <div className="nav-item" onClick={() => navigate('/candidates')}>
            <span>Candidates</span>
          </div>
          <div className="nav-item" onClick={() => navigate('/interviews')}>
            <span>Interviews</span>
          </div>
          <div className="nav-item active">
            <span>Reports</span>
          </div>
        </nav>
      </aside>

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
              <RevealOnScroll key={h.id} delay={(i % 10) * 0.1}>
                <div className="report-card glass-card" style={{ padding: '24px', cursor: 'pointer', transition: 'all 0.3s ease' }} onClick={() => setExpandedId(expandedId === h.id ? null : h.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: '0 0 8px 0', color: 'white', fontSize: '1.2rem' }}>{h.candidateName} <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'normal' }}>({h.role})</span></h3>
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
  const username = localStorage.getItem('interviewer_name') || 'Guest';

  useEffect(() => {
    fetch(`${API_BASE}/api/stats`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error);
  }, []);

  return (
    <div className="dashboard-container">
      <aside className="dashboard-sidebar">
        <div className="sidebar-logo" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }} onClick={() => navigate('/')}>
          <img src="/logo.jpg" alt="Logo" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }} />
          <span>AI Cohort Agent</span>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-item active">
            <span>Overview</span>
          </div>
          <div className="nav-item" onClick={() => navigate('/candidates')}>
            <span>Candidates</span>
          </div>
          <div className="nav-item" onClick={() => navigate('/interviews')}>
            <span>Interviews</span>
          </div>
          <div className="nav-item" onClick={() => navigate('/reports')}>
            <span>Reports</span>
          </div>
        </nav>
      </aside>

      <main className="dashboard-main">
        <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '36px' }}>
          <div className="dashboard-title">
            <h1 style={{ fontSize: '1.85rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>System Overview</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Welcome back, <strong style={{ color: '#f8fafc' }}>{username}</strong>. Real-time candidate intelligence and cohort metrics.</p>
          </div>
          <button 
            style={{ 
              padding: '10px 22px', 
              fontSize: '0.9rem', 
              fontWeight: 600, 
              background: 'rgba(139, 92, 246, 0.12)', 
              color: '#c084fc', 
              border: '1px solid rgba(139, 92, 246, 0.3)', 
              borderRadius: '10px', 
              cursor: 'pointer', 
              transition: 'all 0.2s ease', 
              whiteSpace: 'nowrap' 
            }} 
            onClick={() => navigate('/candidates')}
          >
            Select Candidate &rarr;
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
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.08em', fontWeight: 600 }}>RAG Vector Index</div>
              <div style={{ fontSize: '2.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>Operational</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>
                True Vector Search
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
