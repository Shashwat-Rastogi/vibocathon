import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Antigravity from './Antigravity';
import WaviyText from './WaviyText';
import LampLight from './LampLight';
import DopaCore from './DopaCore';
import TargetCursor from './TargetCursor';
import './index.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

const TypewriterMessage = ({ text }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 20); // 20ms per character typing speed
    
    return () => clearInterval(interval);
  }, [text]);

  return (
    <>
      {displayedText}
      <span className={displayedText.length < text.length ? 'blinking-cursor typing' : 'blinking-cursor done'}></span>
    </>
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
      <nav className="top-nav">
        <div className="nav-logo">AI Cohort Agent</div>
      </nav>

      <main className="hero-section">
        <div className="hero-content">
          <WaviyText text="AI Cohort Interview Agent" />
          <p className="hero-desc">
            Conducts adaptive, technical interviews based on a candidate's actual cohort progress. 
            Tests practical knowledge of RAG, vector search, multi-agent systems, and MCP.
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
                <span className="stat-number">8+</span>
                <span className="stat-label">Adaptive Questions</span>
              </div>
            </div>
          )}
        </div>
      </main>

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
                onChange={(e) => setUsername(e.target.value)}
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
            <h1>Candidates</h1>
            <p>Select a candidate to begin their adaptive technical interview.</p>
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
          </div>
        </div>

        <div className="candidate-grid">
          {filteredAndSorted.length > 0 ? (
            filteredAndSorted.map(c => (
              <div 
                key={c.member.id} 
                onClick={() => navigate('/interview', { state: { candidate: c } })} 
                className="candidate-grid-card"
              >
                <div className="candidate-info">
                  <div className="candidate-name">{c.member.name}</div>
                  <div className="candidate-role">{c.member.jobRole}</div>
                </div>
                <div className="candidate-stats">
                  <span>{c.member.yearsExperience} YOE</span>
                </div>
              </div>
            ))
          ) : (
            <div className="no-candidates">No candidates found matching your criteria.</div>
          )}
        </div>
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
  
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
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
          body: JSON.stringify({ sessionId: newSessionId, candidate: selectedCandidate })
        });
        const data = await res.json();
        if (data.error) {
          setMessages([{ role: 'assistant', content: `Server Error: ${data.error}` }]);
        } else {
          setMessages([{ role: 'assistant', content: data.reply }]);
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
        <div>
          <h2 style={{ color: 'white' }}>Interviewing {selectedCandidate.member.name}</h2>
          <span className="role-badge" style={{ color: '#a1a1aa' }}>{selectedCandidate.member.jobRole}</span>
        </div>
        <button onClick={() => navigate('/')} className="end-btn" style={{ color: 'white', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)' }}>End Session</button>
      </header>
      
      <div className="chat-window">
        <div className="messages-area">
          {messages.map((m, i) => (
            <div key={i} className={`message-wrapper ${m.role}`}>
              <div className="message">
                {m.role === 'assistant' ? <TypewriterMessage text={m.content} /> : m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message-wrapper assistant">
              <div className="message loading-dots">
                <span>.</span><span>.</span><span>.</span>
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
          <form onSubmit={sendMessage} className="input-area">
            <input 
              type="text" 
              className="typewriter-input"
              value={input} 
              onChange={e => setInput(e.target.value)} 
              placeholder="Type your response..." 
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()}>Send</button>
          </form>
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
