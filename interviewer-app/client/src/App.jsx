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

function LandingPage() {
  const [stats, setStats] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
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
    if (username.trim()) {
      localStorage.setItem('interviewer_name', username.trim());
      setIsLoggedIn(true);
      setShowModal(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('interviewer_name');
    setIsLoggedIn(false);
    setUsername('');
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
            Conducts adaptive, technical interviews based on a candidate's actual cohort progress. 
            Powered by a real-time Retrieval-Augmented Generation (RAG) Brain.
          </p>

          <div className="hero-action-box">
            {isLoggedIn ? (
              <div className="action-box-inner">
                <div className="action-text">Welcome back, {username}</div>
                <button className="primary-btn hero-btn" onClick={() => navigate('/candidates')}>
                  Select a Candidate
                </button>
                <button className="secondary-btn logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            ) : (
              <div className="action-box-inner">
                <div className="action-text">Interviewer Login</div>
                <button className="primary-btn hero-btn" onClick={() => setShowModal(true)}>Login</button>
              </div>
            )}
          </div>
          
          <div className="hero-logo-showcase" style={{ marginTop: '40px', marginBottom: '80px' }}>
            <img src="/logo.jpg" alt="AI Cohort Logo" style={{ width: '120px', height: '120px', borderRadius: '24px', boxShadow: '0 0 40px rgba(139, 92, 246, 0.4)', border: '2px solid rgba(255,255,255,0.1)' }} />
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
        <h2 style={{ fontSize: '3rem', textAlign: 'center', marginBottom: '60px' }}>Enterprise-Grade Intelligence</h2>
        <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
          <div className="feature-card glass-card" style={{ padding: '40px', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--accent)', fontSize: '1.5rem', marginBottom: '16px' }}>True RAG Brain</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>We don't just stuff context. Our backend uses Google Gemini's text-embedding-004 to mathematically vector search the curriculum during the interview in real-time.</p>
          </div>
          <div className="feature-card glass-card" style={{ padding: '40px', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--accent)', fontSize: '1.5rem', marginBottom: '16px' }}>Philosophical Personas</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>Tired of boring bots? Get grilled by Socrates or Friedrich Nietzsche. Our system prompts dynamically adapt to interview the candidate in their unique style.</p>
          </div>
          <div className="feature-card glass-card" style={{ padding: '40px', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--accent)', fontSize: '1.5rem', marginBottom: '16px' }}>Adaptive Difficulty</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>The AI reads the candidate's GitHub commit history and mission attempts to perfectly calibrate the starting difficulty of every question.</p>
          </div>
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
            <form onSubmit={handleLogin} className="login-form" style={{ width: '100%', maxWidth: '100%' }}>
              <h2 style={{ marginBottom: '16px', marginTop: 0, color: 'var(--text-primary)' }}>Interviewer Login</h2>
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
              <button type="submit" className="login-btn">Log In</button>
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
          <div className="nav-item" onClick={() => navigate('/')}>
            <span>Overview</span>
          </div>
          <div className="nav-item active">
            <span>Candidates</span>
          </div>
          <div className="nav-item" onClick={() => navigate('/interviews')}>
            <span>Interviews</span>
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
            filteredAndSorted.map(c => (
              <div 
                key={c.member.id} 
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
    setHistory(saved.reverse());
  }, []);

  return (
    <div className="dashboard-container">
      <aside className="dashboard-sidebar">
        <div className="sidebar-logo">AI Cohort Agent</div>
        <nav className="sidebar-nav">
          <div className="nav-item" onClick={() => navigate('/')}>
            <span>Overview</span>
          </div>
          <div className="nav-item" onClick={() => navigate('/candidates')}>
            <span>Candidates</span>
          </div>
          <div className="nav-item active">
            <span>Interviews</span>
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
            <h3>Interview Completed</h3>
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

function BackgroundWrapper({ children }) {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isCandidates = location.pathname === '/candidates';
  const isInterview = location.pathname === '/interview';
  const isInterviews = location.pathname === '/interviews';
  
  return (
    <>
      {isHome && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -2, background: '#050510' }}>
          <DopaCore theme="colorful" count={12000} autoSpin={true} speedMult={1} />
        </div>
      )}
      {(isCandidates || isInterviews) && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -2 }}>
          <Antigravity
            count={250}
            magnetRadius={8}
            ringRadius={8}
            waveSpeed={0.3}
            waveAmplitude={1}
            particleSize={1.5}
            lerpSpeed={0.05}
            color={'#ffffff'}
            autoAnimate={true}
            particleVariance={1}
          />
        </div>
      )}
      {isInterview && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -2 }}>
          <LampLight theme="monochrome" count={15000} />
          {/* Subtle overlay to reduce intensity behind the chat text */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.4)', pointerEvents: 'none' }}></div>
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
          <Route path="/candidates" element={<CandidateSelection />} />
          <Route path="/interviews" element={<InterviewHistory />} />
          <Route path="/interview" element={<Interview />} />
        </Routes>
      </BackgroundWrapper>
    </BrowserRouter>
  );
}

export default App;
