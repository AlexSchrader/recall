import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { api } from '../api.js';

function PinModal({ onUnlock, onClose }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/voice/unlock', { pin });
      onUnlock();
    } catch {
      setError('Incorrect PIN.');
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pin-overlay" onClick={onClose}>
      <div className="pin-modal" onClick={e => e.stopPropagation()}>
        <h3>Voice unlock</h3>
        <p style={{ color: 'var(--muted)', fontSize: '.875rem', marginBottom: '1rem' }}>Enter your PIN to enable Rappel's voice.</p>
        <form onSubmit={submit}>
          <input
            className="pin-input"
            type="text"
            maxLength={7}
            value={pin}
            onChange={e => setPin(e.target.value.toUpperCase())}
            placeholder="R######"
            autoFocus
            autoComplete="off"
          />
          {error && <p className="error-msg" style={{ marginTop: '.5rem' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '.5rem', marginTop: '.75rem' }}>
            <button type="submit" className="btn btn-primary" disabled={busy || pin.length !== 7}>Unlock</button>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ChatThreadPage() {
  const { threadId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initSentRef = useRef(false);
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [voiceUnlocked, setVoiceUnlocked] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [listening, setListening] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [playingTTS, setPlayingTTS] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    api.get(`/chat/threads/${threadId}`)
      .then(data => { setThread(data); setMessages(data.messages ?? []); })
      .catch(() => navigate('/chat'));
    api.get('/voice/status').then(d => setVoiceUnlocked(d.unlocked)).catch(() => {});
  }, [threadId]);

  useEffect(() => {
    const init = searchParams.get('init');
    if (init && thread && messages.length === 0 && !initSentRef.current) {
      initSentRef.current = true;
      sendMessage(null, init);
    }
  }, [thread?.id, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const playTTS = async (text) => {
    if (!voiceEnabled || !voiceUnlocked) return;
    try {
      setPlayingTTS(true);
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play();
      audio.onended = () => { URL.revokeObjectURL(url); setPlayingTTS(false); };
    } catch {
      setPlayingTTS(false);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlayingTTS(false);
  };

  const toggleVoice = () => {
    if (!voiceUnlocked) { setShowPin(true); return; }
    if (voiceEnabled) stopAudio();
    setVoiceEnabled(v => !v);
  };

  const onPinUnlocked = () => {
    setVoiceUnlocked(true);
    setVoiceEnabled(true);
    setShowPin(false);
  };

  const startListening = () => {
    if (!voiceUnlocked) { setShowPin(true); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition is not supported in this browser.'); return; }
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev ? `${prev} ${transcript}` : transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const sendMessage = async (e, overrideContent = null) => {
    if (e) e.preventDefault();
    const content = (overrideContent ?? input).trim();
    if (!content || streaming) return;

    const optimisticUser = { id: `tmp-${Date.now()}`, role: 'user', content, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, optimisticUser]);
    if (!overrideContent) setInput('');
    setStreaming(true);
    setStreamingText('');
    stopAudio();

    try {
      const res = await fetch(`/api/chat/threads/${threadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });

      if (!res.ok) throw new Error('Rappel is unavailable. Try again.');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6));
          if (data.text) { full += data.text; setStreamingText(full); }
        }
      }

      setMessages(prev => [...prev, {
        id: `asst-${Date.now()}`, role: 'assistant', content: full, created_at: new Date().toISOString(),
      }]);

      api.get(`/chat/threads/${threadId}`).then(d => setThread(d)).catch(() => {});
      playTTS(full);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`, role: 'assistant', content: `⚠️ ${err.message}`, created_at: new Date().toISOString(),
      }]);
    } finally {
      setStreaming(false);
      setStreamingText('');
      inputRef.current?.focus();
    }
  };

  if (!thread) return null;

  return (
    <>
      {showPin && <PinModal onUnlock={onPinUnlocked} onClose={() => setShowPin(false)} />}

      <div className="chat-wrap">
        <div className="chat-header">
          <Link to="/chat" className="chat-back">← Rappel</Link>
          <span className="chat-title">{thread.title}</span>
          <button
            className={`voice-btn ${voiceEnabled ? 'voice-btn--on' : ''} ${playingTTS ? 'voice-btn--playing' : ''}`}
            onClick={toggleVoice}
            title={voiceEnabled ? 'Mute Rappel' : 'Unmute Rappel'}
          >
            {voiceEnabled ? '🔊' : '🔇'}
          </button>
        </div>

        <div className="chat-messages">
          {messages.map(m => (
            <div key={m.id} className={`chat-bubble chat-bubble--${m.role}`}>
              {m.role === 'assistant'
                ? <ReactMarkdown className="chat-md">{m.content}</ReactMarkdown>
                : m.content}
            </div>
          ))}
          {streaming && streamingText && (
            <div className="chat-bubble chat-bubble--assistant">
              <ReactMarkdown className="chat-md">{streamingText}</ReactMarkdown>
              <span className="chat-cursor">▋</span>
            </div>
          )}
          {streaming && !streamingText && (
            <div className="chat-bubble chat-bubble--assistant chat-bubble--thinking">
              <span className="chat-dots"><span /><span /><span /></span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form className="chat-input-row" onSubmit={sendMessage}>
          <button
            type="button"
            className={`mic-btn ${listening ? 'mic-btn--active' : ''}`}
            onPointerDown={startListening}
            onPointerUp={stopListening}
            onPointerLeave={stopListening}
            title="Hold to speak"
          >
            🎤
          </button>
          <input
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={listening ? 'Listening…' : 'Ask Rappel anything…'}
            disabled={streaming}
            autoFocus
          />
          <button className="btn btn-primary" type="submit" disabled={streaming || !input.trim()}>
            Send
          </button>
        </form>
      </div>
    </>
  );
}
