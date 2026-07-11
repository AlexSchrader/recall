import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// One-tap ways to start a session with Rappel. Each opens a fresh thread with a
// preset opener; Rappel already knows the user's courses + weak topics via the
// persona's {{USER_CONTEXT}} injection, so the prompts can stay general.
const QUICK_STARTS = [
  {
    emoji: '🎯', label: 'Quiz me', title: 'Quiz me',
    init: "Quiz me on my weakest topics. Ask me one question at a time, wait for my answer, then tell me whether I'm right and why before the next one. Do 5 questions, then give me a quick recap of how I did.",
  },
  {
    emoji: '🧠', label: 'Explain a weak topic', title: 'Explain a topic',
    init: 'Pick one of my weakest topics and explain it to me simply, with a concrete example. Then ask me one question to check I understood it.',
  },
  {
    emoji: '📋', label: 'Plan my study', title: 'Study plan',
    init: 'Based on my weak topics and any upcoming exams, make me a short, prioritised study plan for today. Keep it to a few concrete steps.',
  },
];

export default function ChatListPage() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [busy, setBusy] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    api.get('/chat/threads').then(setThreads).catch(console.error);
  }, []);

  const startNewChat = async () => {
    setBusy(true);
    try {
      const thread = await api.post('/chat/threads', { title: 'New chat' });
      navigate(`/chat/${thread.id}`);
    } finally {
      setBusy(false);
    }
  };

  const startQuick = async (qs) => {
    setBusy(true);
    try {
      const thread = await api.post('/chat/threads', { title: qs.title });
      navigate(`/chat/${thread.id}?init=${encodeURIComponent(qs.init)}`);
    } catch {
      setBusy(false);
    }
  };

  const deleteThread = async (id) => {
    await api.delete(`/chat/threads/${id}`).catch(console.error);
    setThreads(prev => prev.filter(t => t.id !== id));
    setConfirmDeleteId(null);
  };

  return (
    <>
      <div className="page-header">
        <h1>Rappel</h1>
        <button className="btn btn-primary" onClick={startNewChat} disabled={busy}>
          {busy ? '…' : '+ New chat'}
        </button>
      </div>

      {threads.length === 0 && (
        <div className="onboarding">
          <h2 className="onboarding-title">Meet Rappel, your AI tutor.</h2>
          <p className="onboarding-sub">Ask him anything about your courses — he knows your material and your weak spots.</p>
          <button className="btn btn-primary onboarding-cta" onClick={startNewChat} disabled={busy}>
            Start a conversation
          </button>
        </div>
      )}

      {threads.length > 0 && (
        <ul className="item-list">
          {threads.map(t => (
            <li key={t.id} className="item-row" onClick={() => confirmDeleteId !== t.id && navigate(`/chat/${t.id}`)}>
              <span className="label">{t.title}</span>
              <span className="meta">{timeAgo(t.updated_at)}</span>
              {confirmDeleteId === t.id ? (
                <span style={{ display: 'flex', gap: '.4rem' }} onClick={e => e.stopPropagation()}>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteThread(t.id)}>Delete</button>
                  <button className="btn btn-sm" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                </span>
              ) : (
                <button className="btn-icon edit-btn" title="Delete" onClick={e => { e.stopPropagation(); setConfirmDeleteId(t.id); }}>🗑️</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
