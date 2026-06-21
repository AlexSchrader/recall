import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';

export default function ChatThreadPage() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    api.get(`/chat/threads/${threadId}`)
      .then(data => {
        setThread(data);
        setMessages(data.messages ?? []);
      })
      .catch(() => navigate('/chat'));
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || streaming) return;

    const optimisticUser = { id: `tmp-${Date.now()}`, role: 'user', content, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, optimisticUser]);
    setInput('');
    setStreaming(true);
    setStreamingText('');

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
          if (data.text) {
            full += data.text;
            setStreamingText(full);
          }
          if (data.done) break;
        }
      }

      setMessages(prev => [
        ...prev,
        { id: `asst-${Date.now()}`, role: 'assistant', content: full, created_at: new Date().toISOString() },
      ]);

      // Refresh thread title (auto-generated on first message)
      api.get(`/chat/threads/${threadId}`).then(d => setThread(d)).catch(() => {});
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { id: `err-${Date.now()}`, role: 'assistant', content: `⚠️ ${err.message}`, created_at: new Date().toISOString() },
      ]);
    } finally {
      setStreaming(false);
      setStreamingText('');
      inputRef.current?.focus();
    }
  };

  if (!thread) return null;

  return (
    <div className="chat-wrap">
      <div className="chat-header">
        <Link to="/chat" className="chat-back">← Rappel</Link>
        <span className="chat-title">{thread.title}</span>
      </div>

      <div className="chat-messages">
        {messages.map(m => (
          <div key={m.id} className={`chat-bubble chat-bubble--${m.role}`}>
            {m.content}
          </div>
        ))}
        {streaming && streamingText && (
          <div className="chat-bubble chat-bubble--assistant">
            {streamingText}<span className="chat-cursor">▋</span>
          </div>
        )}
        {streaming && !streamingText && (
          <div className="chat-bubble chat-bubble--assistant chat-bubble--thinking">
            <span className="chat-dots"><span/><span/><span/></span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input-row" onSubmit={sendMessage}>
        <input
          ref={inputRef}
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask Rappel anything…"
          disabled={streaming}
          autoFocus
        />
        <button className="btn btn-primary" type="submit" disabled={streaming || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
